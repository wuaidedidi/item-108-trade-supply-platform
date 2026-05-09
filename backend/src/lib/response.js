export function ok(reply, data = null, message = '操作成功') {
  return reply.send({ code: 200, message, data });
}

export function fail(message, statusCode = 400, code = statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export function pageResult(items, total, page, pageSize) {
  return {
    items,
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize)
  };
}
