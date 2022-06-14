export const hello = async (event) => ({ // eslint-disable-line import/prefer-default-export
  statusCode: 200,
  body: JSON.stringify(
    {
      message: 'Go Serverless v2.0! Your function executed successfully!',
      input: event,
    },
    null,
    2,
  ),
});
