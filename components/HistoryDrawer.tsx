import React, { useEffect, useState } from "react";
import { X, Trash2, Clock, Image as ImageIcon } from "lucide-react";
import { translations } from "@/lib/translations";
import { getHistory, deleteHistoryRecord, HistoryRecord } from "@/lib/db";
import { Presentation, PresentationConfig } from "@/lib/types";

type Translation = typeof translations.en;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    presentation: Presentation,
    config: PresentationConfig,
    historyId: string
  ) => void;
  t: Translation;
}

export const HistoryDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelect,
  t,
}) => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const records = await getHistory();
      setHistory(records);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(t.confirmDeleteHistory)) {
      try {
        await deleteHistoryRecord(id);
        await loadHistory();
      } catch (error) {
        console.error("Failed to delete record:", error);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-card border-l border-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {t.historyTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>{t.noHistory}</p>
            </div>
          ) : (
            history.map((record) => (
              <div
                key={record.id}
                onClick={() =>
                  onSelect(record.presentation, record.config, record.id)
                }
                className="group relative bg-muted/50 hover:bg-muted border border-transparent hover:border-primary/20 rounded-lg p-3 cursor-pointer transition-all"
              >
                <div className="aspect-video bg-card rounded overflow-hidden mb-3 relative border border-border">
                  {record.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={record.thumbnail}
                      alt={record.presentation.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate mb-1 text-foreground">
                      {record.presentation.title || "Untitled Presentation"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(record.timestamp)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {record.presentation.slides.length} {t.slidesLabel}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, record.id)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    title={t.deleteHistory}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
