'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useExpenses } from '@/context/ExpenseContext';
import { CATEGORIES, ExpenseFormData, Expense } from '@/types/expense';
import { getTodayISO } from '@/lib/utils';

interface ExpenseFormProps {
  expense?: Expense;
  onSuccess?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

interface FormErrors {
  amount?: string;
  description?: string;
  date?: string;
}

export function ExpenseForm({
  expense,
  onSuccess,
  onCancel,
  compact = false,
}: ExpenseFormProps) {
  const router = useRouter();
  const { addExpense, updateExpense } = useExpenses();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: expense?.amount.toString() || '',
    category: expense?.category || 'Food',
    description: expense?.description || '',
    date: expense?.date || getTodayISO(),
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (expense) {
      setFormData({
        amount: expense.amount.toString(),
        category: expense.category,
        description: expense.description,
        date: expense.date,
      });
    }
  }, [expense]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Please enter a description';
    }

    if (!formData.date) {
      newErrors.date = 'Please select a date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (expense) {
        updateExpense(expense.id, formData);
        toast.success('Expense updated successfully');
      } else {
        addExpense(formData);
        toast.success('Expense added successfully');
        setFormData({
          amount: '',
          category: 'Food',
          description: '',
          date: getTodayISO(),
        });
      }

      if (onSuccess) {
        onSuccess();
      } else if (!compact) {
        router.push('/expenses');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const categoryOptions = CATEGORIES.map((cat) => ({
    value: cat,
    label: cat,
  }));

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Amount"
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          placeholder="0.00"
          step="0.01"
          min="0"
          error={errors.amount}
          icon={
            <span className="text-gray-500 font-medium">$</span>
          }
        />
        <Select
          label="Category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          options={categoryOptions}
        />
      </div>

      <Input
        label="Description"
        type="text"
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="What was this expense for?"
        error={errors.description}
      />

      <Input
        label="Date"
        type="date"
        name="date"
        value={formData.date}
        onChange={handleChange}
        error={errors.date}
        max={getTodayISO()}
      />

      <div className="flex gap-3 pt-2">
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          {expense ? 'Update Expense' : 'Add Expense'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  if (compact) {
    return formContent;
  }

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>{expense ? 'Edit Expense' : 'Add New Expense'}</CardTitle>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
