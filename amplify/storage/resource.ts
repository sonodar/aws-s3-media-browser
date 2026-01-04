import { defineStorage } from '@aws-amplify/backend';
import { thumbnailFunction } from '../functions/thumbnail';

export const storage = defineStorage({
  name: 'mediaBucket',
  access: (allow) => ({
    'media/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete'])
    ],
    'thumbnails/{entity_id}/*': [
      // Users can only read thumbnails (write is done by Lambda)
      allow.entity('identity').to(['read']),
      // Lambda can read original files and write/delete thumbnails
      allow.resource(thumbnailFunction).to(['read', 'write', 'delete'])
    ]
  }),
  triggers: {
    onUpload: thumbnailFunction,
    onDelete: thumbnailFunction,
  },
});
