export const clearAuthSession = () => {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
};

export const getAuthToken = () => {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
};

export const setAuthToken = (token, rememberMe) => {
  if (rememberMe) {
    localStorage.setItem("token", token);
    sessionStorage.removeItem("token");
    return;
  }

  sessionStorage.setItem("token", token);
  localStorage.removeItem("token");
};

export const parseJwtPayload = (token) => {
  if (!token) {
    return null;
  }

  try {
    const base64Payload = token.split(".")[1];
    const payload = atob(base64Payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

export const getAuthUserFromToken = () => {
  const token = getAuthToken();
  const payload = parseJwtPayload(token);

  if (!payload) {
    return null;
  }

  const isExpired = payload.exp && Date.now() >= payload.exp * 1000;

  if (isExpired) {
    clearAuthSession();
    return null;
  }

  return {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    campus: payload.campus || payload.departments,
    college: payload.college || payload.offices,
    department: payload.departments || payload.campus,
    office: payload.offices || payload.college
  };
};
