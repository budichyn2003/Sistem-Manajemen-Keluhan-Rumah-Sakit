/**
 * Complaint Form Component
 * Formulir untuk submit keluhan pasien
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { translations } from '@/lib/i18n';
import { toast } from 'sonner';

const formSchema = z.object({
  patientName: z.string().min(1, translations.form.patientNameRequired),
  department: z.string().min(1, translations.form.departmentRequired),
  complaintText: z.string().min(10, translations.form.complaintTextMinLength),
  insuranceProvider: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function ComplaintForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientName: '',
      department: '',
      complaintText: '',
      insuranceProvider: 'umum',
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.success) {
        setTicketNumber(data.ticket.ticketNumber);
        setShowSuccess(true);
        form.reset();
        toast.success(translations.form.successTitle);
      } else {
        toast.error(translations.form.errorTitle);
      }
    } catch (error) {
      console.error('[Form] Error submitting complaint:', error);
      toast.error(translations.form.errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{translations.form.title}</CardTitle>
          <CardDescription>{translations.form.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Patient Name */}
              <FormField
                control={form.control}
                name="patientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{translations.form.patientName}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={translations.form.patientNamePlaceholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Department */}
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{translations.form.department}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={translations.form.selectDepartment} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="igd">{translations.form.departments.emergency}</SelectItem>
                        <SelectItem value="inpatient">{translations.form.departments.inpatient}</SelectItem>
                        <SelectItem value="outpatient">{translations.form.departments.outpatient}</SelectItem>
                        <SelectItem value="surgery">{translations.form.departments.surgery}</SelectItem>
                        <SelectItem value="nursing">{translations.form.departments.nursing}</SelectItem>
                        <SelectItem value="laboratory">{translations.form.departments.laboratory}</SelectItem>
                        <SelectItem value="pharmacy">{translations.form.departments.pharmacy}</SelectItem>
                        <SelectItem value="billing">{translations.form.departments.billing}</SelectItem>
                        <SelectItem value="other">{translations.form.departments.other}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Complaint Text */}
              <FormField
                control={form.control}
                name="complaintText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{translations.form.complaintText}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={translations.form.complaintTextPlaceholder}
                        className="min-h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Insurance Provider */}
              <FormField
                control={form.control}
                name="insuranceProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{translations.form.insuranceProvider}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'umum'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={translations.form.selectInsurance} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bpjs">{translations.form.insuranceProviders.bpjs}</SelectItem>
                        <SelectItem value="mandiri">{translations.form.insuranceProviders.asuransi_mandiri}</SelectItem>
                        <SelectItem value="allianz">{translations.form.insuranceProviders.allianz}</SelectItem>
                        <SelectItem value="cigna">{translations.form.insuranceProviders.cigna}</SelectItem>
                        <SelectItem value="prudential">{translations.form.insuranceProviders.prudential}</SelectItem>
                        <SelectItem value="umum">{translations.form.insuranceProviders.umum}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? translations.form.submitting : translations.form.submit}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-600">{translations.form.successTitle}</DialogTitle>
            <DialogDescription>
              {translations.form.successMessage}
            </DialogDescription>
          </DialogHeader>
          
          {/* Kotak nomor tiket dipindah ke SINI, di luar DialogHeader & DialogDescription */}
          <div className="bg-gray-100 p-4 rounded mt-2">
            <p className="text-sm text-gray-600">{translations.form.ticketId}</p>
            <p className="text-lg font-mono font-bold text-gray-900">{ticketNumber}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}