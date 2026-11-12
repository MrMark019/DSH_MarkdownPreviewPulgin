// dsh-markdown-preview — Host half.
//
// The feature lives entirely in the browser: the panel reads Markdown through the
// existing `workspaceFiles` Remote and exports HTML with a Blob download. This
// half therefore registers nothing; it exists so the package has an enabled
// Loader entry, which is what makes dsh-client-modules publish the `./client`
// bundle to the page.

export const name = 'markdown-preview'

/** No Host capability is needed; the row only carries the client declaration. */
export function apply() {}