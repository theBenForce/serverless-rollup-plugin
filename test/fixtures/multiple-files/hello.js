export const handle = async () => ({ // eslint-disable-line import/prefer-default-export
  statusCode: 200,
  body: JSON.stringify(
    {
      message: 'Hello',
    },
    null,
    2,
  ),
});
