import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Printer, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { absoluteFromPath, api } from "@/lib/api";

export default function PrintOrder() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const autoPrint = searchParams.get("autoprint") === "1";

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/orders/${orderNumber}`);
      setOrder(data);
    } catch (e) {
      toast.error("Pedido não encontrado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orderNumber]);

  const totalText = useMemo(() => {
    if (!order) return "";
    const symbol = order.currency === "BRL" ? "R$" : order.currency;
    return `${symbol} ${Number(order.total_amount).toFixed(2)}`;
  }, [order]);

  const onMarkPrinted = async () => {
    setMarking(true);
    try {
      await api.post(`/orders/${orderNumber}/mark-printed`);
      toast.success("Marcado como impresso.");
    } catch (e) {
      toast.error("Falha ao marcar como impresso.");
    } finally {
      setMarking(false);
    }
  };

  useEffect(() => {
    if (!order || !autoPrint) return;

    const t = setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        // ignore
      }
    }, 600);

    const after = async () => {
      await onMarkPrinted();
    };

    window.addEventListener("afterprint", after);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", after);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, autoPrint]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-10" data-testid="print-loading-page">
        <div className="mx-auto max-w-3xl text-base text-foreground/60" data-testid="print-loading-text">
          Carregando pedido...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background p-10" data-testid="print-not-found-page">
        <div className="mx-auto max-w-3xl">
          <div className="text-2xl font-extrabold" data-testid="print-not-found-title">
            Pedido não encontrado
          </div>
          <Button
            className="mt-6 rounded-full"
            onClick={() => navigate("/")}
            data-testid="print-not-found-back-button"
          >
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-8" data-testid="print-page">
      <div className="mx-auto max-w-3xl">
        <div className="no-print flex items-center justify-between" data-testid="print-topbar">
          <Button
            variant="ghost"
            className="rounded-2xl px-4 py-3"
            onClick={() => navigate("/")}
            data-testid="print-back-home-button"
          >
            <RotateCcw className="h-5 w-5" />
            Início
          </Button>

          <div className="flex gap-3">
            <Button
              onClick={() => window.print()}
              className="rounded-full bg-secondary px-6 py-4 text-base font-extrabold text-secondary-foreground shadow transition-colors hover:bg-secondary/90"
              data-testid="print-now-button"
            >
              <Printer className="h-5 w-5" />
              Imprimir agora
            </Button>
            <Button
              onClick={onMarkPrinted}
              disabled={marking}
              className="rounded-full bg-primary px-6 py-4 text-base font-extrabold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-60"
              data-testid="print-mark-printed-button"
            >
              <CheckCircle2 className="h-5 w-5" />
              Marcar impresso
            </Button>
          </div>
        </div>

        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="mt-6"
        >
          <div className="text-sm font-semibold uppercase tracking-wide text-foreground/60" data-testid="print-kicker">
            Comprovante
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight" data-testid="print-title">
            {order.store_name}
          </h1>
          <p className="mt-2 text-base text-foreground/70" data-testid="print-subtitle">
            Entregue este comprovante ao cliente para pagamento no caixa.
          </p>
        </motion.div>

        <Card className="mt-6 rounded-[28px] border-black/5 bg-white shadow-xl" data-testid="receipt-card">
          <CardContent className="p-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Pedido</div>
                <div className="mt-1 text-2xl font-extrabold text-secondary" data-testid="receipt-order-number">
                  {order.order_number}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Total</div>
                <div className="mt-1 text-2xl font-extrabold" data-testid="receipt-total">
                  {totalText}
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-2 gap-4 text-sm" data-testid="receipt-details">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Fotos</div>
                <div className="mt-1 text-lg font-bold" data-testid="receipt-photo-count">
                  {order.photo_count}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Preço / foto</div>
                <div className="mt-1 text-lg font-bold" data-testid="receipt-price-per-photo">
                  {Number(order.price_per_photo).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-background/60 p-5 text-sm text-foreground/70" data-testid="receipt-footer">
              {order.receipt_footer || "Leve este comprovante ao caixa para pagamento."}
            </div>
          </CardContent>
        </Card>

        <div className="mt-10" data-testid="print-photos-section">
          <div className="text-sm font-semibold uppercase tracking-wide text-foreground/60" data-testid="print-photos-title">
            Fotos para impressão
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4" data-testid="print-photos-grid">
            {order.photos.map((p) => {
              const photoId = p.photo_id;
              const urlPath = p.url_path;
              const fileName = p.file_name;
              return (
                <div
                  key={photoId}
                  className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm"
                  style={{ breakInside: "avoid" }}
                  data-testid={"print-photo-" + photoId}
                >
                  <img
                    src={absoluteFromPath(urlPath)}
                    alt={fileName}
                    className="h-72 w-full object-cover"
                  />
                  <div
                    className="no-print px-4 py-3 text-xs text-foreground/60"
                    data-testid={"print-photo-name-" + photoId}
                  >
                    {fileName}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="no-print mt-6 text-xs text-foreground/50" data-testid="print-hint">
            Para imprimir somente o comprovante, use a opção de “seleção” no diálogo de impressão.
          </div>
        </div>
      </div>
    </div>
  );
}
