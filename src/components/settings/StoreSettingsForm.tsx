import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/useAppStore";
import { STORE_TYPES } from "@/types";

const schema = z
  .object({
    name: z.string().trim().min(1, "Store name is required.").max(60, "Keep the store name under 60 characters."),
    type: z.enum(["Grocery Store", "Supermarket", "Convenience Store", "Other Retail"], { message: "Select a store type." }),
    location: z.string().trim().min(1, "Store location is required.").max(80, "Keep the location under 80 characters."),
    open: z.string().regex(/^\d{2}:\d{2}$/, "Enter an opening time."),
    close: z.string().regex(/^\d{2}:\d{2}$/, "Enter a closing time."),
  })
  .refine((v) => v.close > v.open, { path: ["close"], message: "Closing time must be after opening time." });

type Values = z.infer<typeof schema>;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-destructive-text">
      {message}
    </p>
  );
}

export function StoreSettingsForm() {
  const store = useAppStore((s) => s.store);
  const updateStore = useAppStore((s) => s.updateStore);

  const toValues = (): Values => ({
    name: store.name,
    type: store.type,
    location: store.location,
    open: store.operatingHours.open,
    close: store.operatingHours.close,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues() });

  // Keep the form in sync with external changes (e.g. demo reset) unless the user is editing.
  useEffect(() => {
    if (!isDirty) reset(toValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  const onSubmit = (v: Values) => {
    updateStore({ name: v.name.trim(), type: v.type, location: v.location.trim(), operatingHours: { open: v.open, close: v.close } });
    reset({ ...v, name: v.name.trim(), location: v.location.trim() });
    toast.success("Settings updated", { description: "Store details were saved." });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="store-name">Store name</Label>
        <Input
          id="store-name"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "store-name-error" : undefined}
          {...register("name")}
        />
        <FieldError id="store-name-error" message={errors.name?.message} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="store-type">Store type</Label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="store-type" aria-invalid={errors.type ? true : undefined}>
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
      <div className="grid gap-1.5">
        <Label htmlFor="store-location">Location</Label>
        <Input
          id="store-location"
          placeholder="City, Province"
          aria-invalid={errors.location ? true : undefined}
          aria-describedby={errors.location ? "store-location-error" : undefined}
          {...register("location")}
        />
        <FieldError id="store-location-error" message={errors.location?.message} />
      </div>
      <fieldset className="grid gap-1.5 sm:col-span-2">
        <legend className="mb-1.5 text-[13px] font-medium">Operating hours</legend>
        <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
          <div className="grid gap-1">
            <Label htmlFor="store-open" className="text-xs font-normal text-muted-foreground">
              Opens
            </Label>
            <Input
              id="store-open"
              type="time"
              aria-invalid={errors.open ? true : undefined}
              aria-describedby={errors.open ? "store-open-error" : undefined}
              {...register("open")}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="store-close" className="text-xs font-normal text-muted-foreground">
              Closes
            </Label>
            <Input
              id="store-close"
              type="time"
              aria-invalid={errors.close ? true : undefined}
              aria-describedby={errors.close ? "store-close-error" : undefined}
              {...register("close")}
            />
          </div>
        </div>
        <FieldError id="store-open-error" message={errors.open?.message} />
        <FieldError id="store-close-error" message={errors.close?.message} />
        <p className="text-helper">Simulated traffic data covers 8 AM – 10 PM regardless of these hours.</p>
      </fieldset>
      <div className="flex items-center justify-end gap-2 sm:col-span-2">
        {isDirty && <span className="mr-auto text-xs text-warning-text">Unsaved changes</span>}
        <Button type="button" variant="outline" disabled={!isDirty} onClick={() => reset(toValues())}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          <Save /> Save store settings
        </Button>
      </div>
    </form>
  );
}
