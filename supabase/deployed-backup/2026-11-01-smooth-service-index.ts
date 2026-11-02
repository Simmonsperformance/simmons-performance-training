Deno.serve(() => {
  return new Response("Edge Function is responding", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
});