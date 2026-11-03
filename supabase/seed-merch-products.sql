-- Merch catalog parsed from https://www.normie.one/merch (May 2026)
-- Run in Supabase SQL Editor after schema.sql / 000_incremental.sql
-- Safe to re-run: skips rows that already exist with the same name + product_url

insert into public.products (name, product_type, product_url, image_url)
select v.name, 'merch', v.product_url, v.image_url
from (
  values
    (
      'Active T-Shirt',
      'https://www.redbubble.com/i/t-shirt/Normie-by-Hashola/180761862/z4fd?asc=u',
      'https://ih1.redbubble.net/image.6141251409.1862/ssrco,active_tee,mens_01,101010:01c5ca27c6,front,square_close_portrait,x1000.jpg'
    ),
    (
      'Pullover Hoodie',
      'https://www.redbubble.com/i/hoodie/Normie-by-Hashola/180761862/2j5j?asc=u',
      'https://ih1.redbubble.net/image.6141783078.1862/ssrco,pullover_hoodie,mens_01,0b0f1a:7573eff8cb,front,square_close_portrait,x1000.jpg'
    ),
    (
      'Fitted T-Shirt',
      -- Live merch page embed used the pullover hoodie link; update if you have the correct fitted-tee URL.
      'https://www.redbubble.com/i/hoodie/Normie-by-Hashola/180761862/2j5j?asc=u',
      'https://ih1.redbubble.net/image.6141783078.1862/ssrco,fitted_tee,womens_01,fafafa:ca443f4786,front,square_close_portrait,x1000.jpg'
    ),
    (
      'Zipped Hoodie',
      'https://www.redbubble.com/i/hoodie/Normie-by-Hashola/180761862/9khb?asc=u',
      'https://ih1.redbubble.net/image.6141783118.1862/ssrco,a_line_dress,womens_01,white,front,square_close_portrait,x1000.jpg'
    ),
    (
      'Tank Top',
      'https://www.redbubble.com/i/tank-top/Normie-by-Hashola/180761862/5xql?asc=u',
      'https://ih1.redbubble.net/image.6141783078.1862/ssrco,tank_top,mens_01,353d77:4d8b4ffd91,front,square_close_portrait,x1000.jpg'
    ),
    (
      'Relaxed Fit T-Shirt',
      'https://www.redbubble.com/i/t-shirt/Normie-by-Hashola/180761862/xcmg?asc=u',
      'https://ih1.redbubble.net/image.6141783078.1862/ssrco,relaxed_fit_tee,womens_01,heather_charcoal_grey,front,square_close_portrait,x1000.jpg'
    ),
    (
      'Classic Mug',
      'https://www.redbubble.com/i/mug/Normie-by-Hashola/180761862/7yqg?asc=u',
      -- Merch modules on /merch had no image_url; add preview URL from Redbubble or Admin → Shop after insert.
      ''
    )
) as v(name, product_url, image_url)
where not exists (
  select 1
  from public.products p
  where p.name = v.name
    and p.product_url = v.product_url
);
