/** Message of a caught value: `catch` receives `unknown`, not always an Error (WEB-216). */
export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));
