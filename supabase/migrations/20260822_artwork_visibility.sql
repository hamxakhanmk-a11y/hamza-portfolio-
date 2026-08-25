alter table public.artworks
  add column if not exists show_on_home boolean not null default true,
  add column if not exists show_on_website boolean not null default true;

update public.artworks
set show_on_home = true,
    show_on_website = true
where show_on_home is null
   or show_on_website is null;
