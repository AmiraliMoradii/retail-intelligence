import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STORE_TYPES, type StoreType } from "@/types";
import { useAppStore } from "@/store/useAppStore";

const DRAFT_KEY = "ri-onboarding-store-draft";

const schema = z.object({
  name: z.string().trim().min(1, "Store name is required.").max(80, "Use 80 characters or fewer."),
  type: z.enum(STORE_TYPES as [StoreType, ...StoreType[]], { message: "Select a store type." }),
  location: z.string().trim().min(1, "Store location is required."),
  aisleCount: z
    .number({ message: "Enter the number of aisles." })
    .int("Use a whole number.")
    .min(1, "A store needs at least 1 aisle.")
    .max(60, "Enter 60 aisles or fewer."),
  cameraCount: z
    .number({ message: "Enter the number of cameras." })
    .int("Use a whole number.")
    .min(1, "Add at least 1 camera to use aisle analytics.")
    .max(32, "Enter 32 cameras or fewer."),
});
export type StoreInfoValues = z.infer<typeof schema>;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-[13px] text-destructive-text">
      {message}
    </p>
  );
}

export function StoreInfoStep({ onDone }: { onDone: () => void }) {
  const store = useAppStore((s) => s.store);
  const updateStore = useAppStore((s) => s.updateStore);
  const setOnboarding = useAppStore((s) => s.setOnboarding);

  const draft = (() => {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as Partial<StoreInfoValues> | null;
    } catch {
      return null;
    }
  })();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StoreInfoValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: draft?.name ?? store.name,
      type: draft?.type ?? store.type,
      location: draft?.location ?? store.location,
      aisleCount: draft?.aisleCount ?? store.aisleCount,
      cameraCount: draft?.cameraCount ?? store.cameraCount,
    },
  });

  // Persist the in-progress form so a refresh doesn't erase it.
  useEffect(() => {
    const sub = watch((v) => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(v));
      } catch {
        /* ignore */
      }
    });
    return () => sub.unsubscribe();
  }, [watch]);

  const onSubmit = (v: StoreInfoValues) => {
    updateStore({ name: v.name, type: v.type, location: v.location, aisleCount: v.aisleCount, cameraCount: v.cameraCount });
    setOnboarding({ storeSaved: true });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5" aria-label="Store information">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="store-name">
            Store name <span aria-hidden="true" className="text-destructive-text">*</span>
          </Label>
          <Input
            id="store-name"
            aria-required="true"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "store-name-error" : undefined}
            {...register("name")}
          />
          <FieldError id="store-name-error" message={errors.name?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="store-type">
            Store type <span aria-hidden="true" className="text-destructive-text">*</span>
          </Label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="store-type" aria-invalid={!!errors.type} aria-describedby={errors.type ? "store-type-error" : undefined}>
                  <SelectValue placeholder="Select a store type" />
                </SelectTrigger>
                <SelectContent>
                  {STORE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError id="store-type-error" message={errors.type?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="store-location">
            Store location <span aria-hidden="true" className="text-destructive-text">*</span>
          </Label>
          <Input
            id="store-location"
            placeholder="City, Province"
            aria-required="true"
            aria-invalid={!!errors.location}
            aria-describedby={errors.location ? "store-location-error" : undefined}
            {...register("location")}
          />
          <FieldError id="store-location-error" message={errors.location?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="store-aisles">
            Number of aisles <span aria-hidden="true" className="text-destructive-text">*</span>
          </Label>
          <Input
            id="store-aisles"
            type="number"
            inputMode="numeric"
            min={1}
            aria-required="true"
            aria-invalid={!!errors.aisleCount}
            aria-describedby={errors.aisleCount ? "store-aisles-error" : "store-aisles-hint"}
            {...register("aisleCount", { valueAsNumber: true })}
          />
          {errors.aisleCount ? (
            <FieldError id="store-aisles-error" message={errors.aisleCount.message} />
          ) : (
            <p id="store-aisles-hint" className="text-helper">
              Include aisles without camera coverage.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="store-cameras">
            Number of cameras <span aria-hidden="true" className="text-destructive-text">*</span>
          </Label>
          <Input
            id="store-cameras"
            type="number"
            inputMode="numeric"
            min={1}
            aria-required="true"
            aria-invalid={!!errors.cameraCount}
            aria-describedby={errors.cameraCount ? "store-cameras-error" : "store-cameras-hint"}
            {...register("cameraCount", { valueAsNumber: true })}
          />
          {errors.cameraCount ? (
            <FieldError id="store-cameras-error" message={errors.cameraCount.message} />
          ) : (
            <p id="store-cameras-hint" className="text-helper">
              Existing CCTV cameras you plan to use.
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end border-t border-border pt-5">
        <Button type="submit" loading={isSubmitting}>
          Save and continue <ArrowRight />
        </Button>
      </div>
    </form>
  );
}
