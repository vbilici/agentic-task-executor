import type { Task } from "@/types/api";
import { TaskItem } from "./TaskItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListTodo } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  title?: string;
}

export function TaskList({ tasks, title = "Tasks" }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ListTodo className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">No tasks yet</p>
        <p className="text-xs mt-1">Describe your goal to generate tasks</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
