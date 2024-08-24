# Nuntium Frontend

This project is the frontend of the Nuntium application, built with React, TypeScript, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (version 6 or higher)

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/your-repo/nuntium-frontend.git
   cd nuntium-frontend
   ```

2. Install the dependencies:
   ```sh
   npm install
   ```

### Running the Application

To start the development server, run:
```sh
npm start
```
Open [http://localhost:3000](http://localhost:3000) to view it in the browser. The page will reload if you make edits. You will also see any lint errors in the console.

### Building for Production

To build the app for production, run:

```sh
npm run build
```

This will create an optimized build in the `build` folder.

### Running Tests

To run the test suite, use:

```sh
npm test
```

This will launch the test runner in the interactive watch mode.

### Ejecting

If you need to customize the configuration, you can eject the app by running:

```sh
npm run eject
```

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

## Project Structure

- `src/`: Contains the source code of the application.
  - `components/`: Reusable UI components.
  - `pages/`: Page components for different routes.
  - `services/`: API service functions.
  - `App.tsx`: Main application component.
  - `index.tsx`: Entry point of the application.
- `public/`: Public assets and the HTML template.
- `tailwind.config.js`: Tailwind CSS configuration.
- `craco.config.js`: Configuration overrides for Create React App.

## Configuration

### Environment Variables

You can set environment variables by creating a `.env` file in the root directory. For example:
    
```
REACT_APP_API_BASE_URL=http://localhost:8000
```


### Tailwind CSS

Tailwind CSS is used for styling. You can customize the theme and other settings in `tailwind.config.js`.

## Learn More

- [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [React documentation](https://reactjs.org/)
- [Tailwind CSS documentation](https://tailwindcss.com/docs)

## License

This project is licensed under the MIT License (Non-Commercial Use). See the LICENSE file for details.