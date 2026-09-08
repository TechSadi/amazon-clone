import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Content-addressed URLs for the site's own CSS and JavaScript.
 *
 * Every file under public/styles and public/scripts is hashed once at
 * boot and `asset('/styles/core.css')` returns
 * `/styles/core.css?v=<hash>`. Because a changed file produces a new
 * URL, those responses can be cached for a year without a deploy
 * leaving returning visitors on last week's stylesheet.
 *
 * Product images are referenced by paths stored in the database and so
 * never pass through here; they are cached for a week instead.
 */
const HASHED_DIRECTORIES = ['styles', 'scripts'];

const hashes = new Map();

function hashFile(filePath) {
    return crypto
        .createHash('sha1')
        .update(fs.readFileSync(filePath))
        .digest('hex')
        .slice(0, 10);
}

function indexDirectory(publicDir, relativeDir) {
    const absoluteDir = path.join(publicDir, relativeDir);

    let entries;

    try {
        entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
    } catch {
        // A directory that is not there yet is not an error: asset()
        // simply falls back to the plain path.
        return;
    }

    for (const entry of entries) {
        const relativePath = `${relativeDir}/${entry.name}`;

        if (entry.isDirectory()) {
            indexDirectory(publicDir, relativePath);
        } else if (entry.isFile()) {
            hashes.set(
                `/${relativePath}`,
                hashFile(path.join(publicDir, relativePath))
            );
        }
    }
}

/** Reads every hashable asset. Called once, at startup. */
export function loadAssetHashes(publicDir) {
    hashes.clear();

    HASHED_DIRECTORIES.forEach((directory) =>
        indexDirectory(publicDir, directory)
    );

    return hashes.size;
}

/**
 * The URL a template should use for one of this site's assets.
 * Unknown paths are returned unchanged rather than throwing, so a typo
 * degrades to an uncached asset instead of a broken page.
 */
export function asset(assetPath) {
    const hash = hashes.get(assetPath);

    return hash ? `${assetPath}?v=${hash}` : assetPath;
}
