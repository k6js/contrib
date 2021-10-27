import { list } from '@k6js/ks-next';
import { text, relationship, password, timestamp, select } from '@k6js/ks-next/fields';
import { document } from '@k6js/ks-next-fields-document';
import { configureTracking } from '@k6js/contrib-list-plugins';

const withTracking = configureTracking({ atTrackingOptions: { isIndexed: true } });

export const lists = {
  User: list(
    withTracking({
      ui: {
        listView: {
          initialColumns: ['name', 'posts'],
        },
      },
      fields: {
        name: text({ validation: { isRequired: true } }),
        email: text({ validation: { isRequired: true }, isIndexed: 'unique', isFilterable: true }),
        password: password({ validation: { isRequired: true } }),
        posts: relationship({ ref: 'Post.author', many: true }),
      },
    })
  ),
  Post: list(
    withTracking({
      fields: {
        title: text(),
        status: select({
          options: [
            { label: 'Published', value: 'published' },
            { label: 'Draft', value: 'draft' },
          ],
          ui: {
            displayMode: 'segmented-control',
          },
        }),
        content: document({
          formatting: true,
          layouts: [
            [1, 1],
            [1, 1, 1],
            [2, 1],
            [1, 2],
            [1, 2, 1],
          ],
          links: true,
          dividers: true,
        }),
        publishDate: timestamp(),
        author: relationship({
          ref: 'User.posts',
          ui: {
            displayMode: 'cards',
            cardFields: ['name', 'email'],
            inlineEdit: { fields: ['name', 'email'] },
            linkToItem: true,
            inlineCreate: { fields: ['name', 'email'] },
          },
        }),
        tags: relationship({
          ref: 'Tag.posts',
          ui: {
            displayMode: 'cards',
            cardFields: ['name'],
            inlineEdit: { fields: ['name'] },
            linkToItem: true,
            inlineConnect: true,
            inlineCreate: { fields: ['name'] },
          },
          many: true,
        }),
      },
    })
  ),
  Tag: list(
    withTracking({
      ui: {
        isHidden: true,
      },
      fields: {
        name: text(),
        posts: relationship({
          ref: 'Post.tags',
          many: true,
          graphql: { omit: ['create', 'update'] },
        }),
      },
    })
  ),
};
