import { createSafeActionClient, DEFAULT_SERVER_ERROR_MESSAGE } from "next-safe-action";
import { z } from "zod";

class MyCustomError extends Error { }

export const actionClient = createSafeActionClient({
    // Can also be an async function.
    handleServerError(e) {
        // Log to console.
        console.error("Action error:", e.message);

        // In this case, we can use the 'MyCustomError` class to unmask errors
        // and return them with their actual messages to the client.
        if (e instanceof MyCustomError) {
            return e.message;
        }

        // Every other error that occurs will be masked with the default message.
        return DEFAULT_SERVER_ERROR_MESSAGE;
    },
});

const schema = z.object({
    username: z.string().min(3).max(10),
    password: z.string().min(8).max(100),
});

export const loginUser = actionClient
    .schema(schema)
    .action(async ({ parsedInput: { username, password } }) => {
        if (username === "johndoe" && password === "123456") {
            return {
                success: "Successfully logged in",
            };
        }

        return { failure: "Incorrect credentials" };
    });