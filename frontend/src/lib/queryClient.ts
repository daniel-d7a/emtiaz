import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { translate } from './i18n';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  mutationCache: new MutationCache({
    onError: (error) => {
      const message = error instanceof Error ? error.message : translate('errorOccurred');
      toast.error(message || translate('errorOccurred'));
    },
  }),
});
