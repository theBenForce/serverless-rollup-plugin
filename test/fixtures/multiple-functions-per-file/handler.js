export const hello = async () => ({
  statusCode: 200,
  body: JSON.stringify(
    {
      message: 'Hello',
    },
    null,
    2,
  ),
});

export const world = async () => ({
  statusCode: 200,
  body: JSON.stringify(
    {
      message: 'World',
    },
    null,
    2,
  ),
});
