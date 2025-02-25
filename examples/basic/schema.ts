import { list, graphQLSchemaExtension, gql, graphql, } from '@k6js/ks-next';
import {
  text,
  relationship,
  checkbox,
  password,
  timestamp,
  select,
  virtual,
  image,
  file,
} from '@k6js/ks-next/fields';
import { document } from '@k6js/ks-next-fields-document';
import { encrypted } from '@k6js/contrib-fields-encrypted';
import { atTracking } from '@k6js/contrib-list-plugins';

// import { cloudinaryImage } from '@keystone-next/cloudinary';
import { KeystoneListsAPI } from '@k6js/ks-next/types';
import { componentBlocks } from './admin/fieldViews/Content';
// import { KeystoneListsTypeInfo } from '.keystone/types';

// TODO: Can we generate this type based on sessionData in the main config?
type AccessArgs = {
  session?: {
    itemId?: string;
    listKey?: string;
    data?: {
      name?: string;
      isAdmin: boolean;
    };
  };
  item?: any;
};
export const access = {
  isAdmin: ({ session }: AccessArgs) => !!session?.data?.isAdmin,
};

const randomNumber = () => Math.round(Math.random() * 10);

const withTracking = atTracking({});

export const lists = {
  User: list(withTracking(
    {
      db: {},
      ui: {
        listView: {
          initialColumns: ['name', 'posts', 'avatar'],
        },
      },
      fields: {
        /** The user's first and last name. */
        name: text({ validation: { isRequired: true } }),
        /** Email is used to log into the system. */
        email: text({
          validation: { isRequired: true },
          isIndexed: 'unique',
          isFilterable: true,
          isOrderable: true,
        }),
        secret: encrypted({
          reverse: true,
          secret: process.env.ENCRYPTION_KEYS || 'Super secret encryption keys for testing',
        }),
        superSecret: encrypted({
          secret: process.env.ENCRYPTION_KEYS || 'Super secret encryption keys for testing',
        }),
        secret2: encrypted({
          reverse: true,
          ui: { displayMode: 'textarea' },
          secret: process.env.ENCRYPTION_KEYS || 'Super secret encryption keys for testing',
        }),
        superSecret2: encrypted({
          ui: { displayMode: 'textarea' },
          secret: process.env.ENCRYPTION_KEYS || 'Super secret encryption keys for testing',
        }),
        /** Avatar upload for the users profile, stored locally */
        avatar: image(),
        attachment: file(),
        /** Used to log in. */
        password: password(),
        /** Administrators have more access to various lists and fields. */
        isAdmin: checkbox({
          access: {
            create: access.isAdmin,
            read: access.isAdmin,
            update: access.isAdmin,
          },
          ui: {
            createView: {
              fieldMode: args => (access.isAdmin(args) ? 'edit' : 'hidden'),
            },
            itemView: {
              fieldMode: args => (access.isAdmin(args) ? 'edit' : 'read'),
            },
          },
        }),
        roles: text({}),
        phoneNumbers: relationship({
          ref: 'PhoneNumber.user',
          many: true,
          ui: {
            // TODO: Work out how to use custom views to customise the card + edit / create forms
            // views: './admin/fieldViews/user/phoneNumber',
            displayMode: 'cards',
            cardFields: ['type', 'value'],
            inlineEdit: { fields: ['type', 'value'] },
            inlineCreate: { fields: ['type', 'value'] },
            linkToItem: true,
            // removeMode: 'delete',
          },
        }),
        posts: relationship({ ref: 'Post.author', many: true }),
        randomNumber: virtual({
          field: graphql.field({
            type: graphql.Float,
            resolve() {
              return randomNumber();
            },
          }),
        }),
      },
    })
  ),
  PhoneNumber: list(
    withTracking({
      ui: {
        isHidden: true,
        // parentRelationship: 'user',
      },
      fields: {
        label: virtual({
          field: graphql.field({
            type: graphql.String,
            resolve(item) {
              return `${item.type} - ${item.value}`;
            },
          }),
          ui: {
            listView: {
              fieldMode: 'hidden',
            },
            itemView: {
              fieldMode: 'hidden',
            },
          },
        }),
        user: relationship({ ref: 'User.phoneNumbers' }),
        type: select({
          options: [
            { label: 'Home', value: 'home' },
            { label: 'Work', value: 'work' },
            { label: 'Mobile', value: 'mobile' },
          ],
          ui: {
            displayMode: 'segmented-control',
          },
        }),
        value: text({}),
      },
    })
  ),
  Post: list(
    withTracking({
      fields: {
        title: text(),
        // TODO: expand this out into a proper example project
        // Enable this line to test custom field views
        // test: text({ ui: { views: require.resolve('./admin/fieldViews/Test.tsx') } }),
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
          ui: { views: require.resolve('./admin/fieldViews/Content.tsx') },
          relationships: {
            mention: {
              kind: 'inline',
              label: 'Mention',
              listKey: 'User',
            },
            featuredAuthors: {
              kind: 'prop',
              listKey: 'User',
              many: true,
              selection: `posts(first: 10) {
            title
          }`,
            },
          },
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
          componentBlocks,
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
      },
    })
  ),
};

export const extendGraphqlSchema = graphQLSchemaExtension({
  typeDefs: gql`
    type Query {
      randomNumber: RandomNumber
    }
    type RandomNumber {
      number: Int
      generatedAt: Int
    }
    type Mutation {
      createRandomPosts: [Post!]!
    }
  `,
  resolvers: {
    RandomNumber: {
      number(rootVal: { number: number; }) {
        return rootVal.number * 1000;
      },
    },
    Mutation: {
      createRandomPosts(root, args, context) {
        // TODO: add a way to verify access control here, e.g
        // await context.verifyAccessControl(userIsAdmin);
        const data = Array.from({ length: 238 }).map((x, i) => ({ data: { title: `Post ${i}` } }));
        // note this usage of the type is important because it tests that the generated
        // KeystoneListsTypeInfo extends Record<string, BaseGeneratedListTypes>
        const lists: KeystoneListsAPI<any> = context.query;
        return lists.Post.createMany({ data });
      },
    },
    Query: {
      randomNumber: () => ({
        number: randomNumber(),
        generatedAt: Date.now(),
      }),
    },
  },
});
