/** Fail closed until an approved client-owned backend is implemented and tested.
 * Environment flags and a browser demo never grant a publishing capability.
 */
export class SetupRequiredError extends Error {
  constructor() { super('Secure sign-in and content storage are not connected. Publishing and uploads are unavailable.'); this.name = 'SetupRequiredError'; }
}
const unavailable = async () => { throw new SetupRequiredError(); };
export const adminRepository = Object.freeze({
  capabilities: Object.freeze({ signIn: false, saveDraft: false, publish: false, upload: false }),
  getSession: async () => null,
  signIn: unavailable,
  saveDraft: unavailable,
  publish: unavailable,
  upload: unavailable
});
