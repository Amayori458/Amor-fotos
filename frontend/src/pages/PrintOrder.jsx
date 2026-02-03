import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Printer, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { absoluteFromPath, api } from "@/lib/api";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_photo-kiosk-5/artifacts/em2ts921_1753098819.amorporfotos.com.br-removebg-preview.png";

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
      const { data } = await api.get("/orders/" + orderNumber);
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
    return symbol + " " + Number(order.total_amount).toFixed(2);
  }, [order]);

  const onMarkPrinted = async () => {
    setMarking(true);
    try {
      await api.post("/orders/" + orderNumber + "/mark-printed");
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
    }, 500);

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
        <div className="mx-auto max-w-3xl text-sm text-foreground/60" data-testid="print-loading-text">
          Carregando pedido...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background p-10" data-testid="print-not-found-page">
        <div className="mx-auto max-w-3xl">
          <div className="text-xl font-bold" data-testid="print-not-found-title">
            Pedido não encontrado
          </div>
          <Button
            className="mt-6 rounded-xl"
            onClick={() => navigate("/")}
            data-testid="print-not-found-back-button"
          >
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const photos = Array.isArray(order.photos) ? order.photos : [];

  return (
    <div className="min-h-screen w-full bg-background" data-testid="print-page">
      <div className="flex min-h-screen w-full flex-col px-14 py-12 2xl:px-20" data-testid="print-shell">
        <div className="no-print flex items-center justify-between" data-testid="print-topbar">
          <Button
            variant="ghost"
            className="rounded-xl px-4 py-3"
            onClick={() => navigate("/")}
            data-testid="print-back-home-button"
          >
            <RotateCcw className="h-5 w-5" />
            Início
          </Button>

          <div className="flex gap-3">
            <Button
              onClick={() => window.print()}
              className="rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/90"
              data-testid="print-now-button"
            >
              <Printer className="h-5 w-5" />
              Imprimir
            </Button>
            <Button
              onClick={onMarkPrinted}
              disabled={marking}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
              data-testid="print-mark-printed-button"
            >
              <CheckCircle2 className="h-5 w-5" />
              Marcar impresso
            </Button>
          </div>
        </div>

        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="mt-6"
        >
          <div className="flex items-center gap-3" data-testid="receipt-header">
            <img src={LOGO_URL} alt="Amor por Fotos" className="h-9 w-auto" data-testid="receipt-logo" />
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">Comprovante</div>
              <div className="text-xl font-bold" data-testid="print-title">{order.store_name}</div>
            </div>
          </div>
          <p className="mt-3 text-sm text-foreground/70" data-testid="print-subtitle">
            Entregue este comprovante ao cliente para pagamento no caixa.
          </p>
        </motion.div>

        <Card className="mt-6 rounded-2xl border border-black/5 bg-white shadow-sm" data-testid="receipt-card">
          <CardContent className="p-7">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">Pedido</div>
                <div className="mt-1 text-xl font-extrabold text-secondary" data-testid="receipt-order-number">
                  {order.order_number}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">Total</div>
                <div className="mt-1 text-xl font-extrabold" data-testid="receipt-total">
                  {totalText}
                </div>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="grid grid-cols-2 gap-4 text-xs" data-testid="receipt-details">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">Fotos</div>
                <div className="mt-1 text-base font-bold" data-testid="receipt-photo-count">
                  {order.photo_count}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">Preço / foto</div>
                <div className="mt-1 text-base font-bold" data-testid="receipt-price-per-photo">
                  {Number(order.price_per_photo).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-muted/60 p-4 text-xs text-foreground/70" data-testid="receipt-footer">
              {order.receipt_footer || "Leve este comprovante ao caixa para pagamento."}
            </div>
          </CardContent>
        </Card>

        <div className="mt-10" data-testid="print-photos-section">
          <div className="text-xs font-medium uppercase tracking-wide text-foreground/60" data-testid="print-photos-title">
            Fotos para impressão
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4" data-testid="print-photos-grid">
            {photos.map((p) => {
              const photoId = p.photo_id;
              const urlPath = p.url_path;
              const fileName = p.file_name;
              return (
                <div
                  key={photoId}
                  className="overflow-hidden rounded-xl border border-black/5 bg-white"
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
        </div>

        <div className="no-print mt-8 text-center text-xs text-foreground/40" data-testid="print-hint">
          Se quiser, no diálogo de impressão você pode escolher o que imprimir (comprovante/fotos).
        </div>
      </div>
    </div>
  );
}
