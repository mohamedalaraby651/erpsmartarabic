import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import {
  Shield,
  Smartphone,
  Key,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";

const TwoFactorSetup = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"check" | "setup" | "verify" | "complete">("check");
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  // Check if 2FA is already enabled
  const { data: settings, isLoading: checkingSettings } = useQuery({
    queryKey: ["2fa-settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_2fa_settings")
        .select("id, user_id, is_enabled, enabled_at, last_used_at, created_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (settings?.is_enabled) {
      setStep("complete");
    }
  }, [settings]);

  const setupMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("verify-totp", {
        body: { action: "setup" },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setSecret(data.secret);
      setOtpauthUrl(data.otpauth_url);
      setBackupCodes(data.backup_codes);
      setStep("setup");
    },
    onError: (error: unknown) => {
      logErrorSafely('TwoFactorSetup.setupMutation', error);
      toast({
        title: "خطأ في إعداد المصادقة الثنائية",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const enableMutation = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.functions.invoke("verify-totp", {
        body: { action: "enable", totp_code: code },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["2fa-settings"] });
      toast({ title: "تم تفعيل المصادقة الثنائية بنجاح" });
      setStep("complete");
    },
    onError: (error: unknown) => {
      logErrorSafely('TwoFactorSetup.enableMutation', error);
      toast({
        title: "رمز غير صحيح",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.functions.invoke("verify-totp", {
        body: { action: "disable", totp_code: code },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["2fa-settings"] });
      toast({ title: "تم إلغاء المصادقة الثنائية" });
      setStep("check");
      setDisableCode("");
    },
    onError: (error: unknown) => {
      logErrorSafely('TwoFactorSetup.disableMutation', error);
      toast({
        title: "رمز غير صحيح",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ" });
  };

  if (checkingSettings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          المصادقة الثنائية (2FA)
        </CardTitle>
        <CardDescription>
          أضف طبقة أمان إضافية لحسابك باستخدام تطبيق مصادقة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === "check" && !settings?.is_enabled && (
          <div className="space-y-4">
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertTitle>ستحتاج إلى تطبيق مصادقة</AlertTitle>
              <AlertDescription>
                مثل Google Authenticator أو Microsoft Authenticator أو أي تطبيق TOTP
              </AlertDescription>
            </Alert>

            <Button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}>
              {setupMutation.isPending ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 ml-2" />
              )}
              تفعيل المصادقة الثنائية
            </Button>
          </div>
        )}

        {step === "setup" && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="font-bold mb-2">1. امسح رمز QR</h3>
              <p className="text-sm text-muted-foreground mb-4">
                افتح تطبيق المصادقة وامسح الرمز التالي
              </p>
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-white rounded-lg inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                أو أدخل هذا الكود يدوياً:
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <code className="bg-muted px-3 py-1 rounded font-mono text-sm">
                  {secret}
                </code>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(secret)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-2">2. احفظ أكواد الاسترداد</h3>
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>مهم جداً!</AlertTitle>
                <AlertDescription>
                  احفظ هذه الأكواد في مكان آمن. ستحتاجها إذا فقدت الوصول لتطبيق المصادقة
                </AlertDescription>
              </Alert>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 left-2 z-10"
                  onClick={() => setShowBackupCodes(!showBackupCodes)}
                >
                  {showBackupCodes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <div className={`grid grid-cols-2 gap-2 p-4 rounded-lg bg-muted ${!showBackupCodes ? "blur-sm" : ""}`}>
                  {backupCodes.map((code, i) => (
                    <code key={i} className="font-mono text-sm text-center py-1">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => copyToClipboard(backupCodes.join("\n"))}
              >
                <Copy className="h-4 w-4 ml-2" />
                نسخ جميع الأكواد
              </Button>
            </div>

            <div>
              <h3 className="font-bold mb-2">3. أدخل رمز التحقق</h3>
              <p className="text-sm text-muted-foreground mb-4">
                أدخل الرمز المكون من 6 أرقام من تطبيق المصادقة
              </p>
              <div className="flex justify-center mb-4" dir="ltr">
                <InputOTP
                  maxLength={6}
                  value={verifyCode}
                  onChange={(value) => setVerifyCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                className="w-full"
                onClick={() => enableMutation.mutate(verifyCode)}
                disabled={verifyCode.length !== 6 || enableMutation.isPending}
              >
                {enableMutation.isPending ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 ml-2" />
                )}
                تفعيل المصادقة الثنائية
              </Button>
            </div>
          </div>
        )}

        {step === "complete" && settings?.is_enabled && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
              <div>
                <p className="font-medium text-success">المصادقة الثنائية مفعّلة</p>
                <p className="text-sm text-muted-foreground">
                  تم التفعيل في{" "}
                  {settings.enabled_at
                    ? new Date(settings.enabled_at).toLocaleDateString("ar-EG")
                    : "-"}
                </p>
              </div>
            </div>

            <div>
              <Label>إلغاء المصادقة الثنائية</Label>
              <p className="text-sm text-muted-foreground mb-3">
                أدخل رمز التحقق من تطبيق المصادقة لإلغاء 2FA
              </p>
              <div className="flex gap-2">
                <div dir="ltr" className="flex-1">
                  <InputOTP
                    maxLength={6}
                    value={disableCode}
                    onChange={(value) => setDisableCode(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => disableMutation.mutate(disableCode)}
                  disabled={disableCode.length !== 6 || disableMutation.isPending}
                >
                  {disableMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "إلغاء"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TwoFactorSetup;
