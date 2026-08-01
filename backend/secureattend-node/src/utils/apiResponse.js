export function success(data, message = null) {
  return {
    success: true,
    message,
    errorCode: null,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function error(message, errorCode = 'ERROR') {
  return {
    success: false,
    message,
    errorCode,
    data: null,
    timestamp: new Date().toISOString(),
  };
}
