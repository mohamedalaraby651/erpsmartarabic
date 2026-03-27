
DROP POLICY "Authenticated users can manage reminders" ON public.customer_reminders;

CREATE POLICY "Users can view reminders" ON public.customer_reminders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create reminders" ON public.customer_reminders FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own reminders" ON public.customer_reminders FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users can delete own reminders" ON public.customer_reminders FOR DELETE TO authenticated USING (created_by = auth.uid());
