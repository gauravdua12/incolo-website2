# Incolo Systems: website 2.0

Redesign of incolo.si. It uses keychain.com's layout, components and navigation, filled with Incolo's own content and blue brand palette.

**Status:** Look-and-feel mockup for approval.

- Blueprint (wireframes, colour/UI mapping, full copy): [docs/BLUEPRINT.md](docs/BLUEPRINT.md)
- Screenshots (desktop 1440px + mobile): [docs/mockups/](docs/mockups/)
- Live mockup: [public/index.html](public/index.html) (homepage) and [public/programs.html](public/programs.html) (AI Programs directory)

## View locally

```bash
python3 -m http.server 4100 --directory public
```

Then open http://localhost:4100. The scoping-call form doesn't send anything yet. In the build it posts to the Express `/api/contact` endpoint.
