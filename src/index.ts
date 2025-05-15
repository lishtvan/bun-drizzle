import { drizzle } from "drizzle-orm/bun-sql";

import * as schema from "./db/schema";
const db = drizzle(process.env.DATABASE_URL!, { schema, casing: "snake_case" });
import { eq } from "drizzle-orm";

const port = 3000;

Bun.serve({
  routes: {
    "/users": {
      GET: async (req) => {
        const comments = await db.query.comments.findMany({
          orderBy: (comments, { desc }) => [desc(comments.postId)],
        });
        console.log(comments.map((comment) => comment.postId));
        const users = await db.query.users.findMany({
          orderBy: (users, { desc }) => [desc(users.id)],
        });
        const tableRows = users
          .map(
            (user) => `
        <tr>
          <td>${user.id}</td>
          <td>${user.name || "N/A"}</td>
          <td>${user.age || "N/A"}</td>
          <td>
            <button onclick=\"deleteUser(${user.id})\">Delete</button>
          </td>
        </tr>
      `
          )
          .join("");

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Users List</title>
          <style>
            table {
              border-collapse: collapse;
              width: 100%;
              max-width: 800px;
              margin: 20px auto;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            form {
              max-width: 800px;
              margin: 20px auto;
            }
            input {
              margin: 5px;
              padding: 5px;
            }
          </style>
          <script>
            async function submitForm(event) {
              event.preventDefault();
              const form = event.target;
              const data = {
                name: form.name.value,
                age: form.age.value
              };
              try {
                const response = await fetch('/users', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(data)
                });
                if (response.status === 301 || response.status === 302) {
                  const location = response.headers.get('Location');
                  if (location) {
                    window.location.href = location;
                  } else {
                    alert("Redirect requested but no Location header found.");
                  }
                } else if (response.ok) {
                  window.location.reload();
                } else {
                  alert("Error: " + response.statusText);
                }
              } catch (error) {
                alert("Error: " + error.message);
              }
            }
            
            async function deleteUser(userId) {
              try {
                const response = await fetch("/users/delete/" + userId, {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                  },
                });
                if (response.ok) {
                  window.location.reload();
                  } else {
                    alert("Error deleting user: " + response.statusText);
                  }
                } catch (error) {
                  alert("Error: " + error.message);
              }
            }
          </script>
        </head>
        <body>
          <h1>Users List</h1>
          <form onsubmit='submitForm(event)'>
            <h2>Add New User</h2>
            <div>
              <label for='name'>Name:</label>
              <input type='text' id='name' name='name' required>
            </div>
            <div>
              <label for='age'>Age:</label>
              <input id='age' name='age' required>
            </div>
            <button type='submit'>Add User</button>
          </form>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Age</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
        </html>
      `;

        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=UTF-8" },
        });
      },
      POST: async (req) => {
        const body = await req.json();
        // @ts-expect-error
        await db.insert(schema.users).values(body);
        return new Response("Redirecting...", {
          status: 301,
          headers: { Location: "/users" },
        });
      },
    },
    "/users/delete/:id": {
      DELETE: async (req) => {
        const url = new URL(req.url);
        const parts = url.pathname.split("/");
        const userId = parseInt(parts[parts.length - 1] || "0", 10);
        if (userId > 0) {
          await db.delete(schema.users).where(eq(schema.users.id, userId));
          return new Response("User deleted", {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=UTF-8" },
          });
        } else {
          return new Response("Invalid user ID", {
            status: 400,
            headers: { "Content-Type": "text/plain; charset=UTF-8" },
          });
        }
      },
    },
  },
  port,
});

console.log(`http server started at http://localhost:${port}`);
