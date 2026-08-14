export function getNetworkBasedSkeletonDelay() {
  const defaultDelay = 350;

  if (typeof navigator === "undefined") {
    return defaultDelay;
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!connection) {
    return defaultDelay;
  }

  const effectiveType = connection.effectiveType;

  if (effectiveType === "slow-2g") {
    return 1200;
  }

  if (effectiveType === "2g") {
    return 900;
  }

  if (effectiveType === "3g") {
    return 650;
  }

  if (effectiveType === "4g") {
    return 300;
  }

  if (typeof connection.downlink === "number") {
    if (connection.downlink < 0.7) {
      return 1000;
    }

    if (connection.downlink < 1.5) {
      return 700;
    }

    if (connection.downlink < 5) {
      return 450;
    }

    return 250;
  }

  return defaultDelay;
}

export function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
