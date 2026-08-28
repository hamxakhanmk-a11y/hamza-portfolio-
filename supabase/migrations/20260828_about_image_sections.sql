alter table public.about_images
  add column if not exists section text not null default 'bio';

update public.about_images
set section = 'bio'
where section is null or section not in ('bio', 'statement');

