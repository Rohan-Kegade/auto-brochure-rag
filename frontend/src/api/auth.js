// Placeholder auth calls until the backend has auth endpoints. They resolve
// after a short delay so the forms' loading states can be seen. Swap the
// bodies for apiRequest calls (see api.js) once /auth/* exists.

const FAKE_DELAY_MS = 600;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const loginApi = async ({ email }) => {
  await wait(FAKE_DELAY_MS);
  return { user: { email } };
};

export const signupApi = async ({ name, email }) => {
  await wait(FAKE_DELAY_MS);
  return { user: { name, email } };
};
