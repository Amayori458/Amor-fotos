import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Printer, RotateCcw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { absoluteFromPath, api } from "@/lib/api";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_photo-kiosk-5/artifacts/em2ts921_1753098819.amorporfotos.com.br-removebg-preview.png";

const fmtDateTime = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR");
  } catch (e) {
    return String(iso);
  }
};

export default function PrintOrder() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const autoPrint = searchParams.get("autoprint") === "1";
  const combined = searchParams.get("combined") === "1";

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

  const currencySymbol = useMemo(() => {
    if (!order) return "";
    if (order.currency === "BRL") return "R$";
    return order.currency;
  }, [order]);

  const totalText = useMemo(() => {
    if (!order) return "";
    return currencySymbol + " " + Number(order.total_amount).toFixed(2);
  }, [order, currencySymbol]);

  const photos = useMemo(() => {
    if (!order || !Array.isArray(order.photos)) return [];
    return order.photos;
  }, [order]);

  useEffect(() => {
    if (!order || !autoPrint) return;
    const t = setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        // ignore
      }
    }, 700);

    const after = async () => {
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
          Carregando...
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
            className="rounded-2xl px-3 py-3"
            onClick={() => navigate("/")}
            data-testid="receipt-back-home-button"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>

          <Button
            onClick={() => window.print()}
            className="rounded-full bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/90"
            data-testid="receipt-print-now-button"
          >
            <Printer className="h-5 w-5" />
            Imprimir
          </Button>
        </div>

        <main className="mx-auto w-full max-w-[760px]" data-testid="receipt-main">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-8"
            data-testid="receipt-header"
          >
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <img src={LOGO_URL} alt="Amor por Fotos" className="h-10 w-auto" data-testid="receipt-logo" />
                <div>
                  <div
                    className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                    data-testid="receipt-kicker"
                  >
                    Comprovante
                  </div>
                  <div className="mt-2 text-2xl font-extrabold tracking-tight" data-testid="receipt-store-name">
                    {order.store_name}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-3" data-testid="receipt-qr-wrapper">
                <QRCodeSVG value={order.order_number} size={92} level="M" includeMargin />
                <div className="mt-2 text-center text-[10px] font-semibold text-foreground/60" data-testid="receipt-qr-label">
                  QR do pedido
                </div>
              </div>
            </div>
          </motion.div>

          <Card className="mt-8 rounded-[28px] border border-black/5 bg-white shadow-sm" data-testid="receipt-card">
            <CardContent className="p-10">
              <div className="flex items-start justify-between gap-6" data-testid="receipt-top-row">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Código</div>
                  <div className="mt-2 font-mono text-2xl font-extrabold tracking-tight text-foreground" data-testid="receipt-order-number">
                    {order.order_number}
                  </div>
                  <div className="mt-2 text-xs text-foreground/45" data-testid="receipt-created-at">
                    {fmtDateTime(order.created_at)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Total</div>
                  <div className="mt-2 text-3xl font-extrabold tracking-tight text-secondary" data-testid="receipt-total">
                    {totalText}
                  </div>
                </div>
              </div>

              <div className="my-8 border-t border-dashed border-black/15" data-testid="receipt-divider" />

              <div className="grid grid-cols-2 gap-8" data-testid="receipt-details">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Fotos</div>
                  <div className="mt-2 text-xl font-bold" data-testid="receipt-photo-count">
                    {order.photo_count}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Preço / foto</div>
                  <div className="mt-2 text-xl font-bold" data-testid="receipt-price-per-photo">
                    {currencySymbol} {Number(order.price_per_photo).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="mt-10 rounded-2xl bg-muted/60 p-5 text-sm text-foreground/70" data-testid="receipt-footer">
                {order.receipt_footer || "Leve este comprovante ao caixa para pagamento."}
              </div>

              <div className="mt-4 text-xs text-foreground/50" data-testid="receipt-privacy-note">
                Privacidade: este comprovante não exibe imagens do cliente.
              </div>
            </CardContent>
          </Card>

          {combined ? (
            <section
              className="mt-12"
              style={{ pageBreakBefore: "always" }}
              data-testid="combined-photos-section"
            >
              <div className="no-print text-xs font-semibold uppercase tracking-wide text-foreground/50" data-testid="combined-photos-kicker">
                Fotos (1 por página)
              </div>

              <div className="mt-4" data-testid="combined-photos-stack">
                {photos.map((p, idx) => {
                  const photoId = p.photo_id;
                  const urlPath = p.url_path;
                  const fileName = p.file_name;
                  return (
                    <div
                      key={photoId}
                      className="bg-white"
                      style={{ pageBreakAfter: idx === photos.length - 1 ? "auto" : "always" }}
                      data-testid={"combined-photo-page-" + photoId}
                    >
                      <img
                        src={absoluteFromPath(urlPath)}
                        alt={fileName}
                        className="h-[92vh] w-full object-contain"
                        data-testid={"combined-photo-image-" + photoId}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
