/**
 * LanguageResolver - Resolves file extensions to markdown-compatible language identifiers.
 *
 * Uses a curated extension-to-language mapping for reliable, dependency-free resolution.
 * This ensures the language tag in fenced code blocks (```lang) is always recognized
 * by markdown renderers for syntax highlighting.
 */
class LanguageResolver {
	/**
	 * Mapping from file extension (without dot) to markdown language identifier.
	 * Only includes extensions where the markdown language id differs from the extension,
	 * or where explicit mapping improves clarity. Extensions not in this map will
	 * fall back to using the extension itself as the language id.
	 */
	static EXTENSION_MAP = {
		// C / C++
		'c': 'c',
		'h': 'c',
		'cpp': 'cpp',
		'cxx': 'cpp',
		'cc': 'cpp',
		'hpp': 'cpp',
		'hxx': 'cpp',
		'hh': 'cpp',

		// C#
		'cs': 'csharp',
		'csx': 'csharp',

		// JavaScript / TypeScript
		'js': 'js',
		'mjs': 'js',
		'cjs': 'js',
		'jsx': 'jsx',
		'ts': 'ts',
		'mts': 'ts',
		'cts': 'ts',
		'tsx': 'tsx',

		// Web
		'html': 'html',
		'htm': 'html',
		'css': 'css',
		'scss': 'scss',
		'sass': 'sass',
		'less': 'less',
		'vue': 'vue',
		'svelte': 'svelte',

		// Data / Config
		'json': 'json',
		'jsonc': 'jsonc',
		'json5': 'json5',
		'yaml': 'yaml',
		'yml': 'yaml',
		'toml': 'toml',
		'xml': 'xml',
		'xsl': 'xml',
		'xslt': 'xml',
		'svg': 'xml',
		'ini': 'ini',
		'cfg': 'ini',
		'conf': 'ini',
		'properties': 'properties',
		'env': 'dotenv',

		// Shell
		'sh': 'bash',
		'bash': 'bash',
		'zsh': 'bash',
		'fish': 'fish',
		'ps1': 'powershell',
		'psm1': 'powershell',
		'psd1': 'powershell',
		'bat': 'bat',
		'cmd': 'bat',

		// Python
		'py': 'python',
		'pyw': 'python',
		'pyi': 'python',
		'pyx': 'python',

		// Ruby
		'rb': 'ruby',
		'erb': 'erb',
		'rake': 'ruby',
		'gemspec': 'ruby',

		// Java / JVM
		'java': 'java',
		'kt': 'kotlin',
		'kts': 'kotlin',
		'scala': 'scala',
		'groovy': 'groovy',
		'gradle': 'groovy',
		'clj': 'clojure',
		'cljs': 'clojure',

		// Go
		'go': 'go',

		// Rust
		'rs': 'rust',

		// Swift / Objective-C
		'swift': 'swift',
		'm': 'objectivec',
		'mm': 'objectivec',

		// PHP
		'php': 'php',

		// Lua
		'lua': 'lua',

		// R
		'r': 'r',
		'R': 'r',
		'rmd': 'rmd',

		// Perl
		'pl': 'perl',
		'pm': 'perl',

		// Haskell
		'hs': 'haskell',
		'lhs': 'haskell',

		// Elixir / Erlang
		'ex': 'elixir',
		'exs': 'elixir',
		'erl': 'erlang',

		// Dart
		'dart': 'dart',

		// SQL
		'sql': 'sql',

		// Markdown / Text
		'md': 'markdown',
		'mdx': 'mdx',
		'txt': 'text',
		'log': 'log',

		// Docker
		'dockerfile': 'dockerfile',

		// GraphQL
		'graphql': 'graphql',
		'gql': 'graphql',

		// Protobuf
		'proto': 'protobuf',

		// LaTeX
		'tex': 'latex',
		'sty': 'latex',

		// Diff / Patch
		'diff': 'diff',
		'patch': 'diff',

		// Makefile
		'mk': 'makefile',

		// Zig
		'zig': 'zig',

		// Nim
		'nim': 'nim',

		// Assembly
		'asm': 'asm',
		's': 'asm',

		// WASM
		'wat': 'wat',
		'wast': 'wat',

		// Terraform
		'tf': 'hcl',
		'tfvars': 'hcl',
		'hcl': 'hcl',

		// Nix
		'nix': 'nix',

		// GLSL / HLSL
		'glsl': 'glsl',
		'vert': 'glsl',
		'frag': 'glsl',
		'hlsl': 'hlsl',

		// Cuda
		'cu': 'cuda',
		'cuh': 'cuda',
	};

	/**
	 * Well-known filenames that have a specific language association.
	 */
	static FILENAME_MAP = {
		'Makefile': 'makefile',
		'makefile': 'makefile',
		'GNUmakefile': 'makefile',
		'Dockerfile': 'dockerfile',
		'Containerfile': 'dockerfile',
		'Jenkinsfile': 'groovy',
		'Vagrantfile': 'ruby',
		'Gemfile': 'ruby',
		'Rakefile': 'ruby',
		'CMakeLists.txt': 'cmake',
	};

	/**
	 * Resolve a file path to its markdown language identifier.
	 *
	 * @param {string} filePath - The file path (absolute or relative)
	 * @returns {string} The markdown language identifier, or empty string if unknown
	 */
	static resolve(filePath) {
		const path = require('path');
		const basename = path.basename(filePath);

		// 1. Check well-known filenames first
		if (LanguageResolver.FILENAME_MAP[basename]) {
			return LanguageResolver.FILENAME_MAP[basename];
		}

		// 2. Extract extension (without dot), lowercase
		const ext = path.extname(filePath).slice(1).toLowerCase();

		if (!ext) {
			return '';
		}

		// 3. Look up in extension map
		if (LanguageResolver.EXTENSION_MAP[ext]) {
			return LanguageResolver.EXTENSION_MAP[ext];
		}

		// 4. Fallback: use the extension itself as the language id
		//    Most markdown renderers are tolerant and will attempt highlighting
		return ext;
	}
}

module.exports = LanguageResolver;
