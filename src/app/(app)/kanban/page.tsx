"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/states";
import { KanbanCard, type BoardCard } from "@/components/kanban/kanban-card";
import { ColumnDroppable } from "@/components/kanban/column-droppable";
import { ColumnHeader } from "@/components/kanban/column-header";
import { AddColumn } from "@/components/kanban/add-column";
import { QuickAddCard } from "@/components/kanban/quick-add-card";
import { ProjectModal } from "@/components/modals/project-modal";
import { ProjectDetailSheet } from "@/components/project/project-detail-sheet";
import { useBoard, useMoveProject, useQuickAddProject } from "@/hooks/queries";
import { ApiError } from "@/lib/api";
import { formatBRLCompact } from "@/lib/format";
import type { KanbanBoardColumn } from "@/lib/api-types";

export default function KanbanPage() {
  const { data, isLoading, isError, refetch } = useBoard();
  const moveMut = useMoveProject();
  const quickAddMut = useQuickAddProject();

  const [board, setBoard] = useState<KanbanBoardColumn[]>([]);
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const origin = useRef<{ columnId: string; index: number } | null>(null);

  // Seed local board from server unless a drag is in progress.
  useEffect(() => {
    if (data && !activeCard) setBoard(data);
  }, [data, activeCard]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const columnIds = useMemo(() => new Set(board.map((c) => c.id)), [board]);

  function columnOfCard(cardId: string) {
    return board.find((c) => c.cards.some((card) => card.projectId === cardId));
  }

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    const col = columnOfCard(id);
    if (!col) return;
    origin.current = { columnId: col.id, index: col.cards.findIndex((c) => c.projectId === id) };
    setActiveCard(col.cards.find((c) => c.projectId === id) ?? null);
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const activeCol = columnOfCard(activeId);
    if (!activeCol) return;
    const overCol = columnIds.has(overId) ? board.find((c) => c.id === overId) : columnOfCard(overId);
    if (!overCol || activeCol.id === overCol.id) return;

    setBoard((prev) => {
      const from = prev.find((c) => c.id === activeCol.id)!;
      const to = prev.find((c) => c.id === overCol.id)!;
      const card = from.cards.find((c) => c.projectId === activeId);
      if (!card) return prev;

      const overIndex = to.cards.findIndex((c) => c.projectId === overId);
      const insertAt = overIndex >= 0 ? overIndex : to.cards.length;

      return prev.map((c) => {
        if (c.id === from.id) return { ...c, cards: c.cards.filter((x) => x.projectId !== activeId) };
        if (c.id === to.id) {
          const next = [...c.cards];
          next.splice(insertAt, 0, card);
          return { ...c, cards: next };
        }
        return c;
      });
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const activeId = String(active.id);
    setActiveCard(null);

    if (!over) {
      origin.current = null;
      if (data) setBoard(data);
      return;
    }

    const overId = String(over.id);
    let working = board;

    const activeCol = working.find((c) => c.cards.some((x) => x.projectId === activeId));
    if (activeCol) {
      const overCol = columnIds.has(overId)
        ? working.find((c) => c.id === overId)
        : working.find((c) => c.cards.some((x) => x.projectId === overId));
      if (overCol && overCol.id === activeCol.id) {
        const oldIndex = activeCol.cards.findIndex((c) => c.projectId === activeId);
        const newIndex = activeCol.cards.findIndex((c) => c.projectId === overId);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          working = working.map((c) =>
            c.id === activeCol.id ? { ...c, cards: arrayMove(c.cards, oldIndex, newIndex) } : c,
          );
          setBoard(working);
        }
      }
    }

    const finalCol = working.find((c) => c.cards.some((x) => x.projectId === activeId));
    const finalIndex = finalCol?.cards.findIndex((c) => c.projectId === activeId) ?? -1;
    const start = origin.current;
    origin.current = null;

    if (!finalCol || finalIndex < 0 || !start) return;
    if (start.columnId === finalCol.id && start.index === finalIndex) return;

    const deliveredTarget = finalCol.isDeliveredColumn && start.columnId !== finalCol.id;

    moveMut.mutate(
      { id: activeId, columnId: finalCol.id, position: finalIndex },
      {
        onSuccess: () => {
          if (deliveredTarget) {
            toast.success("Projeto entregue e adicionado ao faturamento.");
          }
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Não foi possível mover o projeto.");
          if (data) setBoard(data);
        },
      },
    );
  }

  function handleComplete(projectId: string) {
    const delivered = board.find((c) => c.isDeliveredColumn);
    if (!delivered) {
      toast.error("Defina uma coluna como “Entregue” no menu ⋯ da coluna.");
      return;
    }
    // Optimistic: pull the card into the delivered column right away.
    setBoard((prev) => {
      const card = prev.flatMap((c) => c.cards).find((x) => x.projectId === projectId);
      if (!card || delivered.cards.some((x) => x.projectId === projectId)) return prev;
      return prev.map((c) => {
        if (c.id === delivered.id) {
          return { ...c, cards: [...c.cards, { ...card, status: "DELIVERED" as const }] };
        }
        return { ...c, cards: c.cards.filter((x) => x.projectId !== projectId) };
      });
    });
    moveMut.mutate(
      { id: projectId, columnId: delivered.id },
      {
        onSuccess: () => toast.success("Projeto entregue e adicionado ao faturamento."),
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Não foi possível concluir.");
          if (data) setBoard(data);
        },
      },
    );
  }

  async function handleQuickAdd(
    columnId: string,
    data: { title: string; value: number; color?: string },
  ) {
    try {
      await quickAddMut.mutateAsync({ ...data, columnId });
      toast.success("Item adicionado.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao adicionar o item.");
    }
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-4 lg:h-[calc(100dvh-6rem)]">
      <PageHeader
        title="Kanban de Produção"
        description="Arraste os projetos pelo fluxo. Ao chegar em “Entregue”, o financeiro é criado automaticamente."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Novo projeto
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState rows={6} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="-mx-4 flex-1 overflow-x-auto px-4 pb-2 scrollbar-thin sm:mx-0 sm:px-0">
            <div className="flex h-full gap-3">
              {board.map((col) => (
                <section
                  key={col.id}
                  className="flex h-full w-[280px] shrink-0 flex-col rounded-2xl border border-line bg-surface"
                >
                  <ColumnHeader column={col} count={col.cards.length} canDelete={board.length > 1} />

                  <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
                    <ColumnDroppable id={col.id} className="min-h-full">
                      <SortableContext
                        items={col.cards.map((c) => c.projectId)}
                        strategy={verticalListSortingStrategy}
                      >
                        {col.cards.map((card) => (
                          <KanbanCard
                            key={card.projectId}
                            card={card}
                            onOpen={setOpenProject}
                            onComplete={handleComplete}
                          />
                        ))}
                      </SortableContext>
                      <QuickAddCard
                        pending={quickAddMut.isPending}
                        onCreate={(d) => handleQuickAdd(col.id, d)}
                      />
                    </ColumnDroppable>
                  </div>

                  <footer className="border-t border-line px-3 py-2 text-xs text-content-subtle">
                    {formatBRLCompact(col.cards.reduce((s, c) => s + c.value, 0))}
                  </footer>
                </section>
              ))}

              <AddColumn />
            </div>
          </div>

          <DragOverlay>
            {activeCard ? <KanbanCard card={activeCard} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <ProjectModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultColumnId={board[0]?.id}
        onCreated={(p) => setOpenProject(p.id)}
      />
      <ProjectDetailSheet projectId={openProject} onOpenChange={(o) => !o && setOpenProject(null)} />
    </div>
  );
}
