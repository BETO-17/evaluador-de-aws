import JSZip from 'jszip';
import type { AnalyzerInput } from '../types/awsTypes';

export interface ProjectFile {
  path: string;
  content: string;
}

// Directorios excluidos del análisis
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'venv',
  '.venv',
  '__pycache__',
  'dist',
  'build',
  '.next',
  'vendor',
  'target',
]);

// Archivos reconocidos para detección de arquitectura y stack
const TARGET_FILENAMES = new Set([
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'pipfile',
  'composer.json',
  'pom.xml',
  'build.gradle',
  'go.mod',
  'gemfile',
  'dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  '.env.example',
  'readme.md',
]);

/**
 * Verifica si una ruta está en un directorio ignorado o excede 3 niveles de profundidad.
 */
function isPathAllowed(path: string): boolean {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  const segments = normalized.split('/').filter(Boolean);

  // Máximo 3 niveles de carpetas (ej. backend/src/package.json tiene 2 carpetas + 1 archivo)
  if (segments.length > 4) {
    return false;
  }

  // Verificar si alguna carpeta padre es ignorada
  for (let i = 0; i < segments.length - 1; i++) {
    if (IGNORED_DIRS.has(segments[i])) {
      return false;
    }
  }

  const filename = segments[segments.length - 1];
  return TARGET_FILENAMES.has(filename);
}

/**
 * Lee y extrae archivos relevantes desde un paquete ZIP en el navegador.
 */
export async function readZipFile(file: File): Promise<ProjectFile[]> {
  const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
  if (file.size > MAX_SIZE) {
    throw new Error('El archivo ZIP excede el tamaño máximo permitido de 20 MB.');
  }

  if (!file.name.toLowerCase().endsWith('.zip')) {
    throw new Error('Formato no válido. Solo se admiten archivos comprimidos con extensión .zip.');
  }

  const zip = new JSZip();
  let zipData: JSZip;
  try {
    zipData = await zip.loadAsync(file);
  } catch {
    throw new Error('No se pudo leer el archivo ZIP. Asegúrate de que no esté corrupto ni protegido por contraseña.');
  }

  const projectFiles: ProjectFile[] = [];

  for (const [relativePath, zipEntry] of Object.entries(zipData.files)) {
    if (zipEntry.dir) continue;

    if (isPathAllowed(relativePath)) {
      try {
        const text = await zipEntry.async('string');
        projectFiles.push({
          path: relativePath,
          content: text,
        });
      } catch {
        // Ignorar archivo si falla la decodificación de texto
      }
    }
  }

  return projectFiles;
}

/**
 * Parsea una URL de GitHub pública (soporta ramas opcionales /tree/<branch>).
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string } {
  const cleanUrl = url.trim().replace(/\/$/, '');
  const regex = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/;
  const match = cleanUrl.match(regex);

  if (!match) {
    throw new Error('Formato de URL no válido. Usa el formato: https://github.com/usuario/repositorio');
  }

  const owner = match[1];
  let repo = match[2];
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4);
  }
  const branch = match[3];

  return { owner, repo, branch };
}

/**
 * Consulta la API pública de GitHub y descarga hasta 15 archivos reconocidos.
 */
export async function readGitHubRepo(url: string): Promise<ProjectFile[]> {
  const { owner, repo, branch: requestedBranch } = parseGitHubUrl(url);

  // 1. Obtener metadatos del repositorio para confirmar rama por defecto
  let targetBranch = requestedBranch;
  try {
    if (!targetBranch) {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (repoRes.status === 404) {
        throw new Error('Repositorio no encontrado o privado. Solo repositorios públicos de GitHub son accesibles.');
      }
      if (repoRes.status === 403) {
        throw new Error('Límite de consultas a la API de GitHub alcanzado. Intenta de nuevo en unos minutos.');
      }
      if (!repoRes.ok) {
        throw new Error(`Error de GitHub (${repoRes.status}): No se pudo acceder al repositorio.`);
      }

      const repoData = await repoRes.json();
      targetBranch = repoData.default_branch || 'main';
    }
  } catch (err: unknown) {
    if (err instanceof Error && (err.message.includes('Repositorio') || err.message.includes('Límite'))) {
      throw err;
    }
    throw new Error('No se pudo conectar con GitHub. Verifica tu conexión a internet.');
  }

  // 2. Obtener árbol de archivos del repositorio
  let treeItems: Array<{ path: string; type: string }>;
  try {
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`
    );
    if (treeRes.status === 404) {
      throw new Error(`Rama '${targetBranch}' o repositorio no encontrado en GitHub.`);
    }
    if (treeRes.status === 403) {
      throw new Error('Límite de consultas a la API de GitHub alcanzado. Intenta de nuevo en unos minutos.');
    }
    if (!treeRes.ok) {
      throw new Error('No se pudo obtener el árbol de archivos del repositorio.');
    }
    const treeData = await treeRes.json();
    treeItems = treeData.tree || [];
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('GitHub')) {
      throw err;
    }
    throw new Error('No se pudo conectar con la API de GitHub.');
  }

  // 3. Filtrar archivos reconocidos (máximo 15)
  const allowedPaths = treeItems
    .filter((item) => item.type === 'blob' && isPathAllowed(item.path))
    .map((item) => item.path)
    .slice(0, 15);

  if (allowedPaths.length === 0) {
    return [];
  }

  // 4. Descargar contenido crudo desde raw.githubusercontent.com
  const projectFiles: ProjectFile[] = [];
  const downloads = allowedPaths.map(async (filePath) => {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${targetBranch}/${filePath}`;
      const res = await fetch(rawUrl);
      if (res.ok) {
        const text = await res.text();
        projectFiles.push({
          path: filePath,
          content: text,
        });
      }
    } catch {
      // Ignorar fallo de un archivo individual
    }
  });

  await Promise.all(downloads);
  return projectFiles;
}

/**
 * Lee un documento local (.md, .txt) o texto pegado.
 */
export async function readDocument(
  fileOrText: File | { name: string; text: string }
): Promise<ProjectFile[]> {
  if ('text' in fileOrText && typeof fileOrText.text === 'string') {
    return [
      {
        path: fileOrText.name || 'documento.txt',
        content: fileOrText.text,
      },
    ];
  }

  const file = fileOrText as File;
  const MAX_DOC_SIZE = 1 * 1024 * 1024; // 1 MB
  if (file.size > MAX_DOC_SIZE) {
    throw new Error('El documento supera el tamaño máximo permitido de 1 MB.');
  }

  const ext = file.name.toLowerCase();
  if (!ext.endsWith('.md') && !ext.endsWith('.txt')) {
    throw new Error('Formato no válido. Solo se admiten archivos de texto .md o .txt.');
  }

  try {
    const text = await file.text();
    return [
      {
        path: file.name,
        content: text,
      },
    ];
  } catch {
    throw new Error('No se pudo leer el contenido del documento.');
  }
}

/**
 * Función unificada para leer cualquier AnalyzerInput.
 */
export async function readProjectInput(input: AnalyzerInput): Promise<ProjectFile[]> {
  switch (input.kind) {
    case 'zip':
      return readZipFile(input.file);
    case 'github':
      return readGitHubRepo(input.url);
    case 'document':
      return readDocument(input.file);
    default:
      throw new Error('Tipo de entrada de proyecto desconocido.');
  }
}
