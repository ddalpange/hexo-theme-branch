const postGenerator = require('hexo/lib/plugins/generator/post');

const util = require('util');


const pagination = (base, posts, options) => {
  if (typeof base !== 'string') throw new TypeError('base must be a string!');
  if (!posts) throw new TypeError('posts is required!');
  options = options || {};

  if (base && base[base.length - 1] !== '/') base += '/';

  const length = posts.length;
  const perPage = options.hasOwnProperty('perPage') ? +options.perPage : 10;
  const total = perPage ? Math.ceil(length / perPage) : 1;
  const format = options.format || 'page/%d/';
  const layout = options.layout || ['archive', 'index'];
  const data = options.data || {};
  const result = [];
  const urlCache = {};

  function formatURL(i) {
    if (urlCache[i]) return urlCache[i];

    let url = base;
    if (i > 1) url += util.format(format, i);
    urlCache[i] = url;

    return url;
  }

  function makeData(i) {
    const data = {
      base,
      total,
      current: i,
      current_url: formatURL(i),
      posts: perPage ? posts.slice(perPage * (i - 1), perPage * i) : posts,
      prev: 0,
      prev_link: '',
      next: 0,
      next_link: ''
    };

    if (i > 1) {
      data.prev = i - 1;
      data.prev_link = formatURL(data.prev);
    }

    if (i < total) {
      data.next = i + 1;
      data.next_link = formatURL(data.next);
    }

    return data;
  }

  if (perPage) {
    for (let i = 1; i <= total; i++) {
      result.push({
        path: formatURL(i),
        layout,
        data: Object.assign(makeData(i), data)
      });
    }
  } else {
    result.push({
      path: base,
      layout,
      data: Object.assign(makeData(1), data)
    });
  }

  return result;
};

hexo.config.index_generator = Object.assign({
  per_page: typeof hexo.config.per_page === 'undefined' ? 10 : hexo.config.per_page,
  order_by: '-date'
}, hexo.config.index_generator);

hexo.extend.generator.register('index', function(locals) {
  const config = hexo.config;
  const posts = locals.posts.sort(config.index_generator.order_by).slice(0, 10);

  return {
    path: '/',
    data: {
      posts: posts,
    },
    layout: ['index'],
  };
});

hexo.extend.generator.register('posts', function(locals) {
  const config = hexo.config;
  const perPage = config.per_page;
  const posts = locals.posts.sort('-date');
  const paginationDir = config.pagination_dir || '';
  const path = config.index_generator.path || 'posts';

  return pagination(path, posts, {
    perPage: perPage,
    layout: ['posts', 'archive'],
    format: paginationDir ? paginationDir + '/%d/' : '%d/',
    data: {
      __index: true,
    }
  });
});

/**
 * Modify previous and next post link
 */
hexo.extend.generator.register('post', function(locals) {
  return postGenerator(locals).map(route => {
    let post = route.data;
    if (post.next) {
      let next = post.next;
      while (next && post.lang !== next.lang) {
        next = next.next;
      }
      post.next = next;
      if (next) {
        next.prev = post;
      }
    }
    if (post.prev) {
      let prev = post.prev;
      while (prev && post.lang !== prev.lang) {
        prev = prev.prev;
      }
      post.prev = prev;
      if (prev) {
        prev.next = post;
      }
    }
    return route;
  });
});