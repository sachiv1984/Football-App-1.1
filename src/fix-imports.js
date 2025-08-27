const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');

function updateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Replace imports of feature-specific components from '@/components'
  // Fixtures components
  content = content.replace(
    /import\s+\{\s*(FixturesList|FixtureCard|HeroSection|MatchHeader)[^}]*\}\s+from\s+['"]@\/components['"]/g,
    (match, comp) => {
      if (comp === 'FixturesList') return `import FixturesList from '@/components/fixtures/FixturesList/FixturesList';`;
      if (comp === 'FixtureCard') return `import FixtureCard from '@/components/fixtures/FixtureCard/FixtureCard';`;
      if (comp === 'HeroSection') return `import HeroSection from '@/components/fixtures/HeroSection/HeroSection';`;
      if (comp === 'MatchHeader') return `import MatchHeader from '@/components/fixtures/MatchHeader/MatchHeader';`;
      return match;
    }
  );

  // League components
  content = content.replace(
    /import\s+\{\s*(LeagueTable)[^}]*\}\s+from\s+['"]@\/components['"]/g,
    `import LeagueTable from '@/components/league/LeagueTable/LeagueTable';`
  );

  // Insights components
  content = content.replace(
    /import\s+\{\s*(AIInsightCard|InsightsContainer|ConfidenceIndicator)[^}]*\}\s+from\s+['"]@\/components['"]/g,
    (match, comp) => {
      if (comp === 'AIInsightCard') return `import AIInsightCard from '@/components/insights/AIInsightCard/AIInsightCard';`;
      if (comp === 'InsightsContainer') return `import InsightsContainer from '@/components/insights/AIInsightCard/InsightsContainer';`;
      if (comp === 'ConfidenceIndicator') return `import ConfidenceIndicator from '@/components/insights/AIInsightCard/ConfidenceIndicator';`;
      return match;
    }
  );

  // 2. Remove curly braces for common components (safe to keep them from index)
  content = content.replace(
    /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]@\/components['"]/g,
    (match, comps) => {
      return `import { ${comps.trim()} } from '@/components';`;
    }
  );

  fs.writeFileSync(filePath, content, 'utf8');
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      updateImports(fullPath);
    }
  }
}

walkDir(SRC_DIR);
console.log('✅ Import paths updated successfully!');
