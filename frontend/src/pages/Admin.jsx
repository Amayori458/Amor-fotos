import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BadgeDollarSign, KeyRound, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  const [verified, setVerified] = useState(false);
  const [pin, setPin] = useState("");

  const [storeName, setStoreName] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [pricePerPhoto, setPricePerPhoto] = useState("2.50");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [newPin, setNewPin] = useState("");

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
      setStoreName(String(data.store_name || "Amor por Fotos"));
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
    if (verified) load();
  }, [verified]);

  const verifyPin = async () => {
    try {
      const { data } = await api.post("/admin/verify-pin", { pin });
      if (data?.ok) {
        setVerified(true);
        toast.success("Acesso liberado.");
      } else {
        toast.error("PIN incorreto.");
      }
    } catch (e) {
      toast.error("PIN incorreto.");
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const p = Number(pricePerPhoto);
      if (Number.isNaN(p) || p < 0) {
        toast.message("Preço por foto inválido.");
        return;
      }

      const payload = {
        store_name: storeName.trim() || "Amor por Fotos",
        currency,
        price_per_photo: p,
        receipt_footer: receiptFooter,
      };
      if (newPin.trim()) payload.admin_pin = newPin.trim();

      await api.put("/settings", payload);
      toast.success("Salvo.");
      navigate("/");
    } catch (e) {
      toast.error("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background" data-testid="admin-page">
      <Dialog open={!verified}>
        <DialogContent className="rounded-2xl" data-testid="admin-pin-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="admin-pin-title">
              <KeyRound className="h-5 w-5 text-primary" />
              PIN do Admin
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4" data-testid="admin-pin-content">
            <div className="space-y-2">
              <Label htmlFor="pin" data-testid="admin-pin-label">PIN</Label>
              <Input
                id="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="••••"
                inputMode="numeric"
                data-testid="admin-pin-input"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="rounded-xl"
                onClick={() => navigate("/")}
                data-testid="admin-pin-cancel-button"
              >
                Cancelar
              </Button>
              <Button
                onClick={verifyPin}
                className="flex-1 rounded-xl bg-primary text-primary-foreground"
                data-testid="admin-pin-submit-button"
              >
                Entrar
              </Button>
            </div>
            <div className="text-xs text-foreground/50" data-testid="admin-pin-hint">
              Padrão: 1234
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {verified ? (
        <div className="flex min-h-screen w-full flex-col px-14 py-12 2xl:px-20" data-testid="admin-shell">
          <header className="flex items-center justify-between" data-testid="admin-header">
            <div className="flex items-center gap-4" data-testid="admin-brand">
              <img src={LOGO_URL} alt="Amor por Fotos" className="h-12 w-auto" data-testid="admin-logo" />
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">Configuração</div>
                <div className="text-xl font-bold" data-testid="admin-title">Ajustes</div>
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
            transition={{ duration: 0.3 }}
            className="mt-10"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">Totem</div>
            <div className="mt-2 text-4xl font-extrabold tracking-tight" data-testid="admin-headline">
              Configurações
            </div>
          </motion.div>

          <div className="mt-10 grid gap-8" data-testid="admin-content">
            <Card className="rounded-2xl border border-black/5 bg-white shadow-sm" data-testid="admin-settings-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base" data-testid="admin-settings-card-title">
                  <BadgeDollarSign className="h-5 w-5 text-primary" />
                  Comprovante
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="storeName" data-testid="admin-store-name-label">Loja</Label>
                    <Input
                      id="storeName"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="h-11 rounded-xl"
                      data-testid="admin-store-name-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price" data-testid="admin-price-label">Preço/foto</Label>
                    <Input
                      id="price"
                      inputMode="decimal"
                      value={pricePerPhoto}
                      onChange={(e) => setPricePerPhoto(e.target.value)}
                      className="h-11 rounded-xl"
                      data-testid="admin-price-input"
                    />
                    <div className="text-xs text-foreground/50" data-testid="admin-price-hint">
                      {currencyLabel} {Number(pricePerPhoto || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency" data-testid="admin-currency-label">Moeda</Label>
                    <Input
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                      className="h-11 rounded-xl"
                      data-testid="admin-currency-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPin" data-testid="admin-new-pin-label">Trocar PIN</Label>
                    <Input
                      id="newPin"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="h-11 rounded-xl"
                      placeholder="Novo PIN"
                      inputMode="numeric"
                      data-testid="admin-new-pin-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receiptFooter" data-testid="admin-receipt-footer-label">Texto</Label>
                  <Textarea
                    id="receiptFooter"
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    className="min-h-[110px] rounded-xl"
                    data-testid="admin-receipt-footer-textarea"
                  />
                </div>

                <div className="rounded-xl bg-muted/60 p-4 text-xs text-foreground/60" data-testid="admin-note">
                  Privacidade: comprovante não imprime as imagens do cliente.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
