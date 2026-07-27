'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPlan(formData) {
  const name = formData.get('name');
  const description = formData.get('description');
  const price = parseFloat(formData.get('price'));
  const interval = formData.get('interval');
  const trialDays = parseInt(formData.get('trial_days') || '0');
  const imageUrl = formData.get('image_url');
  const isActive = formData.get('is_active') === 'true';

  await db.query(
    `INSERT INTO subscription_plans (name, description, price, interval, trial_days, image_url, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [name, description, price, interval, trialDays, imageUrl, isActive]
  );
  revalidatePath('/admin/subscriptions');
  return { success: true };
}

export async function updatePlan(formData) {
  const id = formData.get('id');
  const name = formData.get('name');
  const description = formData.get('description');
  const price = parseFloat(formData.get('price'));
  const interval = formData.get('interval');
  const trialDays = parseInt(formData.get('trial_days') || '0');
  const imageUrl = formData.get('image_url');
  const isActive = formData.get('is_active') === 'true';

  await db.query(
    `UPDATE subscription_plans
     SET name=$1, description=$2, price=$3, interval=$4, trial_days=$5, image_url=$6, is_active=$7
     WHERE id=$8`,
    [name, description, price, interval, trialDays, imageUrl, isActive, id]
  );
  revalidatePath('/admin/subscriptions');
  return { success: true };
}

export async function togglePlanActive(formData) {
  const id = formData.get('id');
  await db.query(`UPDATE subscription_plans SET is_active = NOT is_active WHERE id = $1`, [id]);
  revalidatePath('/admin/subscriptions');
  return { success: true };
}

export async function deletePlan(formData) {
  const id = formData.get('id');
  await db.query(`DELETE FROM subscription_plans WHERE id = $1`, [id]);
  revalidatePath('/admin/subscriptions');
  return { success: true };
}
