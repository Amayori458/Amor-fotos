import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Printer, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { api } from "@/lib/api";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_photo-kiosk-5/artifacts/em2ts921_1753098819.amorporfotos.com.br-removebg-preview.png";

export default function PrintOrder() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  const totalText = useMemo(() => {
    if (!order) return "";
    const symbol = order.currency === "BRL" ? "R$" : order.currency;
    return symbol + " " + Number(order.total_amount).toFixed(2);
  }, [order]);

  const openPhotosPrint = () => {
    const url = "/print/" + orderNumber + "/photos?autoprint=1";
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) toast.message("Permita pop-ups para imprimir as fotos.");
  };

  useEffect(() => {
    if (!order || !autoPrint) return;

    // Pre-open photos window (helps against popup blockers)
    const photosWindow = window.open(
      "/print/" + orderNumber + "/photos?autoprint=1",
      "_blank",
      "noopener,noreferrer",
    );

    const t = setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        // ignore
      }
    }, 450);

    const after = async () => {
      // if popup was blocked above, try again
      if (!photosWindow) openPhotosPrint();
      try {
        await api.post("/orders/" + orderNumber + "/mark-printed");
      } catch (e) {
        // ignore
      }
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
      <div className="min-h-screen bg-background p-10" data-testid="receipt-loading-page">
        <div className="text-sm text-foreground/60" data-testid="receipt-loading-text">
          Carregando comprovante...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background p-10" data-testid="receipt-not-found-page">
        <div className="text-xl font-bold" data-testid="receipt-not-found-title">
          Pedido não encontrado
        </div>
        <Button
          className="mt-6 rounded-xl"
          onClick={() => navigate("/")}
          data-testid="receipt-not-found-back-button"
        >
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background" data-testid="receipt-page">
      <div className="flex min-h-screen w-full flex-col px-14 py-12 2xl:px-20" data-testid="receipt-shell">
        <div className="no-print flex items-center justify-between" data-testid="receipt-topbar">
          <Button
            variant="ghost"
            className="rounded-xl px-4 py-3"
            onClick={() => navigate("/")}
            data-testid="receipt-back-home-button"
          >
            <RotateCcw className="h-5 w-5" />
            Início
          </Button>

          <div className="flex gap-3">
            <Button
              onClick={() => window.print()}
              className="rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/90"
              data-testid="receipt-print-now-button"
            >
              <Printer className="h-5 w-5" />
              Imprimir comprovante
            </Button>
            <Button
              onClick={openPhotosPrint}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              data-testid="receipt-print-photos-button"
            >
              <Printer className="h-5 w-5" />
              Imprimir fotos
            </Button>
          </div>
        </div>

        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="mt-8"
          data-testid="receipt-header"
        >
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Amor por Fotos" className="h-10 w-auto" data-testid="receipt-logo" />
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-foreground/60" data-testid="receipt-kicker">
                Comprovante
              </div>
              <div className="text-2xl font-bold" data-testid="receipt-store-name">{order.store_name}</div>
            </div>
          </div>
        </motion.div>

        <Card className="mt-8 rounded-2xl border border-black/5 bg-white shadow-sm" data-testid="receipt-card">
          <CardContent className="p-10">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">Pedido</div>
                <div className="mt-2 text-2xl font-extrabold text-secondary" data-testid="receipt-order-number">
                  {order.order_number}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">Total</div>
                <div className="mt-2 text-2xl font-extrabold" data-testid="receipt-total">
                  {totalText}
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            <div className="grid grid-cols-2 gap-8" data-testid="receipt-details">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">Fotos</div>
                <div className="mt-2 text-xl font-bold" data-testid="receipt-photo-count">
                  {order.photo_count}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">Preço / foto</div>
                <div className="mt-2 text-xl font-bold" data-testid="receipt-price-per-photo">
                  {Number(order.price_per_photo).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-xl bg-muted/60 p-5 text-sm text-foreground/70" data-testid="receipt-footer">
              {order.receipt_footer || "Leve este comprovante ao caixa para pagamento."}
            </div>

            <div className="mt-4 text-xs text-foreground/50" data-testid="receipt-privacy-note">
              Privacidade: este comprovante não exibe imagens do cliente.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
