import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BadgeDollarSign, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { api } from "@/lib/api";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_photo-kiosk-5/artifacts/em2ts921_1753098819.amorporfotos.com.br-removebg-preview.png";

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [pricePerPhoto, setPricePerPhoto] = useState("2.50");
  const [receiptFooter, setReceiptFooter] = useState("");

  const currencyLabel = useMemo(() => {
    if (currency === "BRL") return "R$";
    if (currency === "USD") return "$";
    if (currency === "EUR") return "€";
    return currency;
  }, [currency]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      setStoreName(data.store_name || "Amor por Fotos");
      setCurrency(data.currency || "BRL");
      setPricePerPhoto(String(data.price_per_photo ?? 2.5));
      setReceiptFooter(data.receipt_footer || "");
    } catch (e) {
      toast.error("Não foi possível carregar os ajustes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      const p = Number(pricePerPhoto);
      if (Number.isNaN(p) || p < 0) {
        toast.message("Preço por foto inválido.");
        return;
      }

      await api.put("/settings", {
        store_name: storeName.trim() || "Amor por Fotos",
        currency,
        price_per_photo: p,
        receipt_footer: receiptFooter,
      });

      toast.success("Ajustes salvos.");
      navigate("/");
    } catch (e) {
      toast.error("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background" data-testid="admin-page">
      <div className="flex min-h-screen w-full flex-col px-14 py-12 2xl:px-20" data-testid="admin-shell">
        <header className="flex items-center justify-between" data-testid="admin-header">
          <div className="flex items-center gap-3" data-testid="admin-brand">
            <img src={LOGO_URL} alt="Amor por Fotos" className="h-10 w-auto" data-testid="admin-logo" />
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">Configuração</div>
              <div className="text-lg font-bold" data-testid="admin-title">Ajustes do Totem</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="rounded-xl px-4 py-3"
              onClick={() => navigate("/")}
              data-testid="admin-back-button"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar
            </Button>

            <Button
              onClick={onSave}
              disabled={saving || loading}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
              data-testid="admin-save-button"
            >
              <Save className="h-5 w-5" />
              Salvar
            </Button>
          </div>
        </header>

        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="mt-8"
        >
          <p className="text-sm text-foreground/70" data-testid="admin-subtitle">
            Defina nome da loja e preço por foto (usado no comprovante).
          </p>
        </motion.div>

        <Card className="mt-6 rounded-2xl border border-black/5 bg-white shadow-sm" data-testid="admin-settings-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base" data-testid="admin-settings-card-title">
              <BadgeDollarSign className="h-5 w-5 text-primary" />
              Configurações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="storeName" data-testid="admin-store-name-label">
                Nome da loja
              </Label>
              <Input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="Amor por Fotos"
                data-testid="admin-store-name-input"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency" data-testid="admin-currency-label">
                  Moeda
                </Label>
                <Input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  className="h-11 rounded-xl"
                  placeholder="BRL"
                  data-testid="admin-currency-input"
                />
                <div className="text-xs text-foreground/50" data-testid="admin-currency-hint">
                  Ex: BRL, USD, EUR
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" data-testid="admin-price-label">
                  Preço por foto
                </Label>
                <Input
                  id="price"
                  inputMode="decimal"
                  value={pricePerPhoto}
                  onChange={(e) => setPricePerPhoto(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="2.50"
                  data-testid="admin-price-input"
                />
                <div className="text-xs text-foreground/50" data-testid="admin-price-hint">
                  No comprovante: {currencyLabel} {Number(pricePerPhoto || 0).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiptFooter" data-testid="admin-receipt-footer-label">
                Texto no rodapé do comprovante
              </Label>
              <Textarea
                id="receiptFooter"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="min-h-[110px] rounded-xl"
                placeholder="Leve este comprovante ao caixa para pagamento."
                data-testid="admin-receipt-footer-textarea"
              />
            </div>

            <div className="rounded-xl bg-muted/60 p-4 text-xs text-foreground/60" data-testid="admin-note">
              Impressão em teste com impressora comum: o navegador abrirá o diálogo de impressão.
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="mt-4 text-xs text-foreground/50" data-testid="admin-loading-text">
            Carregando...
          </div>
        ) : null}
      </div>
    </div>
  );
}
