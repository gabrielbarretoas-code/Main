const TODOIST_API_URL = "https://api.todoist.com/rest/v2/tasks";

/**
 * Cria uma tarefa no Todoist a partir dos dados extraídos de uma mensagem do WhatsApp.
 */
export async function createTodoistTask({
  apiToken,
  title,
  description,
  priority = "p4",
  labels = [],
  dueString,
}) {
  const priorityMap = { p1: 4, p2: 3, p3: 2, p4: 1 };

  const payload = {
    content: title,
    description,
    priority: priorityMap[priority] ?? 1,
    labels: Array.from(new Set(["whatsapp", ...labels])),
  };

  if (dueString) {
    payload.due_string = dueString;
    payload.due_lang = "pt";
  }

  const res = await fetch(TODOIST_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Falha ao criar tarefa no Todoist: ${res.status} ${errorText}`);
  }

  return res.json();
}
