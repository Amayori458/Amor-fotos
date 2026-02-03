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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="min-h-screen bg-background px-6 py-10" data-testid="admin-page">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between" data-testid="admin-header">
          <Button
            variant="ghost"
            className="rounded-2xl px-4 py-3"
            onClick={() => navigate("/")}
            data-testid="admin-back-button"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar
          </Button>

          <Button
            onClick={onSave}
            disabled={saving || loading}
            className="rounded-full bg-primary px-6 py-4 text-base font-extrabold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-60"
            data-testid="admin-save-button"
          >
            <Save className="h-5 w-5" />
            Salvar
          </Button>
        </div>

        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="mt-6"
        >
          <h1 className="text-4xl font-extrabold tracking-tight" data-testid="admin-title">
            Ajustes do Totem
          </h1>
          <p className="mt-2 text-base text-foreground/70" data-testid="admin-subtitle">
            Defina nome da loja e preço por foto (para o comprovante).
          </p>
        </motion.div>

        <Card className="mt-6 rounded-[28px] border-black/5 bg-white/80 shadow-xl" data-testid="admin-settings-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl" data-testid="admin-settings-card-title">
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
                className="h-12 rounded-2xl"
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
                  className="h-12 rounded-2xl"
                  placeholder="BRL"
                  data-testid="admin-currency-input"
                />
                <div className="text-xs text-foreground/60" data-testid="admin-currency-hint">
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
                  className="h-12 rounded-2xl"
                  placeholder="2.50"
                  data-testid="admin-price-input"
                />
                <div className="text-xs text-foreground/60" data-testid="admin-price-hint">
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
                className="min-h-[110px] rounded-2xl"
                placeholder="Leve este comprovante ao caixa para pagamento."
                data-testid="admin-receipt-footer-textarea"
              />
            </div>

            <div className="rounded-3xl border border-black/5 bg-background/60 p-5 text-sm text-foreground/70" data-testid="admin-note">
              Dica: para teste com impressora comum, o sistema abre o diálogo do navegador.
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="mt-4 text-sm text-foreground/60" data-testid="admin-loading-text">
            Carregando...
          </div>
        ) : null}
      </div>
    </div>
  );
}
