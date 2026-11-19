import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Boxes, Eye, EyeOff, Footprints, KeyRound, ShieldCheck, TrendingUp, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandMark } from "@/components/layout/BrandMark";
import { BRAND } from "@/config/brand";
import { DEMO_CREDENTIALS } from "@/data/mockStore";
import { login } from "@/services/mockApi";
import { useAuthStore } from "@/store/useAuthStore";
import { useAppStore } from "@/store/useAppStore";

const schema = z.object({
  email: z.string().trim().min(1, "Please enter a valid email address.").pipe(z.email("Please enter a valid email address.")),
  password: z.string().min(1, "Password is required."),
  remember: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const HIGHLIGHTS = [
  { icon: Footprints, title: "Aisle traffic from existing CCTV", body: "Aisle visits, dwell time and peak hours from footage you already record." },
  { icon: TrendingUp, title: "Demand forecasts", body: "Product-level forecasts from historical sales CSVs, compared across models." },
  { icon: Boxes, title: "Order recommendations", body: "Suggested order quantities with a transparent, editable calculation." },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useAuthStore((s) => s.signIn);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });

  useEffect(() => {
    document.title = `Sign in · ${BRAND.name}`;
    setFocus("email");
  }, [setFocus]);

  useEffect(() => {
    if (authError) errorRef.current?.focus();
  }, [authError]);

  const onSubmit = async (values: FormValues) => {
    setAuthError(null);
    try {
      const user = await login(values.email, values.password);
      signIn(user, values.remember);
      const from = (location.state as { from?: string } | null)?.from;
      const onboarded = useAppStore.getState().onboarding.completed;
      navigate(onboarded ? (from ?? "/overview") : "/onboarding", { replace: true });
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Invalid email or password.");
    }
  };

  const fillDemo = () => {
    setValue("email", DEMO_CREDENTIALS.email, { shouldValidate: true });
    setValue("password", DEMO_CREDENTIALS.password, { shouldValidate: true });
    setAuthError(null);
    setFocus("password");
  };

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Form column */}
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <BrandMark />
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">
            <h1 className="text-page-title">Sign in to your store</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Monitor customer traffic, inventory performance and demand forecasts.</p>

            {/* Demo account */}
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary-soft p-4">
              <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold text-foreground">Demo account</p>
                  <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
                    <dt>Email</dt>
                    <dd className="truncate font-mono text-foreground">{DEMO_CREDENTIALS.email}</dd>
                    <dt>Password</dt>
                    <dd className="font-mono text-foreground">{DEMO_CREDENTIALS.password}</dd>
                  </dl>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={fillDemo}>
                Use demo account
              </Button>
            </div>

            {authError && (
              <div
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                className="mt-5 flex items-center gap-2.5 rounded-lg border border-destructive/25 bg-destructive-soft px-3.5 py-2.5 text-sm font-medium text-foreground outline-none"
              >
                <XCircle className="size-4 shrink-0 text-destructive-text" aria-hidden="true" />
                {authError}
              </div>
            )}

            <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Sign in">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@store.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  {...register("email")}
                />
                {errors.email && (
                  <p id="email-error" role="alert" className="text-[13px] text-destructive-text">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <span className="text-xs text-muted-foreground">Password reset is not available in the prototype</span>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="pr-10"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    aria-controls="password"
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" role="alert" className="text-[13px] text-destructive-text">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="remember"
                  render={({ field }) => (
                    <Checkbox id="remember" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                  )}
                />
                <Label htmlFor="remember" className="font-normal text-muted-foreground">
                  Remember me on this device
                </Label>
              </div>

              <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
                {isSubmitting ? "Signing in…" : "Sign in"}
                {!isSubmitting && <ArrowRight />}
              </Button>
            </form>

            <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Simulated sign-in for the {BRAND.course}. Credentials are checked in the browser and never sent to a server.
            </p>
          </div>
        </main>
        <p className="text-xs text-muted-foreground">© 2026 {BRAND.name} · University of Calgary CPSC 598 project</p>
      </div>

      {/* Showcase column */}
      <aside
        aria-label="Product highlights"
        className="relative hidden overflow-hidden bg-[#0b1530] text-white lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 80% 10%, rgba(37,99,235,0.55) 0%, transparent 70%), radial-gradient(50% 45% at 10% 95%, rgba(27,175,122,0.28) 0%, transparent 70%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "44px 44px" }}
        />
        <div className="relative max-w-xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-blue-200 uppercase">Retail intelligence for independent grocers</p>
          <h2 className="mt-4 text-[2.15rem] leading-[1.15] font-semibold tracking-tight">
            Turn the cameras and sales records you already have into daily decisions.
          </h2>
          <ul className="mt-10 space-y-6">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <h.icon className="size-5 text-blue-200" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">{h.title}</p>
                  <p className="mt-0.5 text-sm leading-6 text-slate-300">{h.body}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Illustrative preview card */}
          <div className="mt-12 rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10 backdrop-blur-sm" aria-hidden="true">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-200">Aisle visits today</p>
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-200 uppercase">
                Demo data
              </span>
            </div>
            <div className="mt-4 space-y-2.5">
              {[
                ["Snacks", 310],
                ["Produce", 245],
                ["Bakery", 205],
                ["Dairy", 182],
              ].map(([name, v]) => (
                <div key={name} className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-3 text-xs">
                  <span className="text-slate-300">{name}</span>
                  <span className="h-2 rounded-full bg-white/10">
                    <span className="block h-2 rounded-full bg-blue-400" style={{ width: `${((v as number) / 310) * 100}%` }} />
                  </span>
                  <span className="text-right font-semibold tabular">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
