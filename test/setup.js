import { use } from 'chai';

use((await import('chai-as-promised')).default); // eslint-disable-line unicorn/no-await-expression-member
use((await import('dirty-chai')).default); // eslint-disable-line unicorn/no-await-expression-member
