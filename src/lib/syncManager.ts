import { supabase } from '@/integrations/supabase/client';
import {
  getPendingSyncItems,
  removeSyncItem,
  clearSyncQueue,
  cacheData,
} from './offlineStorage';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
}

type TableName = 'customers' | 'products' | 'invoices' | 'quotations' | 'suppliers';

// Sync pending changes to server
export async function syncToServer(): Promise<SyncResult> {
  const pendingItems = await getPendingSyncItems();
  
  let synced = 0;
  let failed = 0;
  let conflicts = 0;
  
  for (const item of pendingItems) {
    try {
      const tableName = item.table as TableName;
      const recordId = (item.data as { id?: string }).id;
      switch (item.operation) {
        case 'insert': {
          const { error: insertError } = await supabase
            .from(tableName)
            .insert(item.data as never);

          if (insertError) {
            // Check for conflict (duplicate key)
            if (insertError.code === '23505') {
              conflicts++;
              // Server wins - remove from queue
              await removeSyncItem(item.id);
            } else {
              failed++;
            }
          } else {
            synced++;
            await removeSyncItem(item.id);
          }
          break;
        }

        case 'update': {
          const { error: updateError } = await supabase
            .from(tableName)
            .update(item.data as never)
            .eq('id', recordId ?? '');

          if (updateError) {
            failed++;
          } else {
            synced++;
            await removeSyncItem(item.id);
          }
          break;
        }

        case 'delete': {
          const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .eq('id', recordId ?? '');

          if (deleteError) {
            failed++;
          } else {
            synced++;
            await removeSyncItem(item.id);
          }
          break;
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
      failed++;
    }
  }
  
  return {
    success: failed === 0,
    synced,
    failed,
    conflicts,
  };
}

// Refresh local cache from server
export async function refreshCache(): Promise<void> {
  try {
    // Fetch and cache customers
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    if (customers) {
      await cacheData('customers', customers);
    }
    
    // Fetch and cache products
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (products) {
      await cacheData('products', products);
    }
    
    // Fetch and cache invoices (last 100)
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (invoices) {
      await cacheData('invoices', invoices);
    }
    
    // Fetch and cache quotations (last 100)
    const { data: quotations } = await supabase
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (quotations) {
      await cacheData('quotations', quotations);
    }
    
    // Fetch and cache suppliers
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    if (suppliers) {
      await cacheData('suppliers', suppliers);
    }
    
    console.log('Cache refreshed successfully');
  } catch (error) {
    console.error('Failed to refresh cache:', error);
  }
}

// Full sync: push pending changes then pull latest data
export async function fullSync(): Promise<SyncResult> {
  // First, sync local changes to server
  const syncResult = await syncToServer();
  
  // Then refresh local cache with server data
  await refreshCache();
  
  return syncResult;
}
