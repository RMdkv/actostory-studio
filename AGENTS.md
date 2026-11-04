<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep workout UI and logic in the Treinos feature modules; reuse the existing authenticated route and shell to avoid changes to other sections.
- Store workout days and session snapshots as validated JSON in owner-scoped Cloud tables; snapshots preserve history when a plan changes or is deleted.
- Workout AI runs only through authenticated server functions and server-only Responses helpers, selecting exercises from the shared catalog so generated plans remain editable and illustrated.
- Guest demo mode uses anonymous Cloud sessions; restrictive RLS (public.is_guest()) blocks guests from social writes and other users' data, and workout AI rejects anonymous claims server-side.
- RUN mode lives in src/components/acto/run and src/lib/run; Leaflet loads lazily behind ClientOnly with OpenStreetMap tiles (no API key), and runs are stored owner-scoped with guest inserts blocked by RLS.
