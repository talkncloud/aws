/**
 * Simple typescript lambda handler example.
 *
 * @returns json
 */
export const handler = async () => {
  console.info("handler: handler is running");

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: {
      message: "howdy do, if you're reading this you did it!",
    },
  };
};
