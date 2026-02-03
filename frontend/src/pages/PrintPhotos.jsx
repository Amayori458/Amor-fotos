import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { absoluteFromPath, api } from "@/lib/api";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_photo-kiosk-5/artifacts/em2ts921_1753098819.amorporfotos.com.br-removebg-preview.png";

export default function PrintPhotos() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get("autoprint") === "1";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

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
    }, 450);
    return () => clearTimeout(t);
  }, [order, autoPrint]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-10" data-testid="print-photos-loading-page">
        <div className="text-sm text-foreground/60" data-testid="print-photos-loading-text">
          Carregando fotos...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background p-10" data-testid="print-photos-not-found-page">
        <div className="text-xl font-bold" data-testid="print-photos-not-found-title">
          Pedido não encontrado
        </div>
        <Button
          className="mt-6 rounded-xl"
          onClick={() => navigate("/")}
          data-testid="print-photos-not-found-back-button"
        >
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background" data-testid="print-photos-page">
      <div className="no-print flex items-center justify-between px-14 py-10" data-testid="print-photos-topbar">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="Amor por Fotos" className="h-9 w-auto" data-testid="print-photos-logo" />
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">Impressão</div>
            <div className="text-lg font-bold" data-testid="print-photos-title">Fotos (1 por página)</div>
          </div>
        </div>

        <Button
          variant="ghost"
          className="rounded-xl px-4 py-3"
          onClick={() => navigate("/")}
          data-testid="print-photos-back-home-button"
        >
          <RotateCcw className="h-5 w-5" />
          Início
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="px-10 pb-10"
        data-testid="print-photos-content"
      >
        {photos.length === 0 ? (
          <div className="text-sm text-foreground/60" data-testid="print-photos-empty">
            Nenhuma foto.
          </div>
        ) : (
          <div data-testid="print-photos-stack">
            {photos.map((p, idx) => {
              const photoId = p.photo_id;
              const urlPath = p.url_path;
              const fileName = p.file_name;
              const pageTestId = "print-photo-page-" + photoId;
              return (
                <div
                  key={photoId}
                  className="bg-white"
                  style={{ pageBreakAfter: idx === photos.length - 1 ? "auto" : "always" }}
                  data-testid={pageTestId}
                >
                  <img
                    src={absoluteFromPath(urlPath)}
                    alt={fileName}
                    className="h-[92vh] w-full object-contain"
                    data-testid={"print-photo-image-" + photoId}
                  />
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
