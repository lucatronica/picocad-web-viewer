
const userAgent = navigator.userAgent;

export const isSafari = userAgent.includes("Safari/") && !userAgent.includes("Edg/");
